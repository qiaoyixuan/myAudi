// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: light-gray; icon-glyph: magic;
// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-gray; icon-glyph: code-branch;

class Base {
  constructor(arg = '') {
    this.arg = arg;
    this._actions = {};
    this.init();
  }

  init(widgetFamily = config.widgetFamily) {
    // 组件大小：small,medium,large
    this.widgetFamily = widgetFamily;
    // 系统设置的key，这里分为三个类型：
    // 1. 全局
    // 2. 不同尺寸的小组件
    // 3. 不同尺寸+小组件自定义的参数
    // 当没有key2时，获取key1，没有key1获取全局key的设置
    // this.SETTING_KEY = this.md5(Script.name()+'@'+this.widgetFamily+'@'+this.arg)
    // this.SETTING_KEY1 = this.md5(Script.name()+'@'+this.widgetFamily)
    this.SETTING_KEY = this.md5(Script.name());
    // 插件设置
    this.settings = this.getSettings();
  }

  /**
   * 注册点击操作菜单
   * @param {string} name 操作函数名
   * @param {function} func 点击后执行的函数
   */
  registerAction(name, func) {
    this._actions[name] = func.bind(this);
  }

  /**
   * 生成操作回调URL，点击后执行本脚本，并触发相应操作
   * @param {string} name 操作的名称
   * @param {string} data 传递的数据
   */
  actionUrl(name = '', data = '') {
    let u = URLScheme.forRunningScript();
    let q = `act=${encodeURIComponent(name)}&data=${encodeURIComponent(data)}&__arg=${encodeURIComponent(this.arg)}&__size=${this.widgetFamily}`;
    let result = '';
    if (u.includes('run?')) {
      result = `${u}&${q}`;
    } else {
      result = `${u}?${q}`;
    }
    return result;
  }

  /**
   * HTTP 请求接口
   * @param options 配置项
   * @return {string | json | null}
   */
  async http(options) {
    const url = options?.url || url;
    const method = options?.method || 'GET';
    const headers = options?.headers || {};
    const body = options?.body || '';
    const json = options?.json || true;

    let response = new Request(url);
    response.method = method;
    response.headers = headers;
    if (method === 'POST' || method === 'post') response.body = body;
    const resp = (json ? response.loadJSON() : response.loadString());
    console.log(url);
    console.log(resp);
    return resp;
  }

  /**
   * 获取远程图片内容
   * @param {string} url 图片地址
   * @param {boolean} useCache 是否使用缓存（请求失败时获取本地缓存）
   */
  async getImageByUrl(url, useCache = true) {
    const cacheKey = this.md5(url);
    const cacheFile = FileManager.local().joinPath(FileManager.local().temporaryDirectory(), cacheKey);
    // 判断是否有缓存
    if (useCache && FileManager.local().fileExists(cacheFile)) {
      return Image.fromFile(cacheFile);
    }
    try {
      const req = new Request(url);
      const img = await req.loadImage();
      // 存储到缓存
      FileManager.local().writeImage(cacheFile, img);
      return img;
    } catch (e) {
      // 没有缓存+失败情况下，返回自定义的绘制图片（红色背景）
      let ctx = new DrawContext();
      ctx.size = new Size(100, 100);
      ctx.setFillColor(Color.red());
      ctx.fillRect(new Rect(0, 0, 100, 100));
      return ctx.getImage();
    }
  }

  /**
   * 弹出一个通知
   * @param {string} title 通知标题
   * @param {string} body 通知内容
   * @param {string} url 点击后打开的URL
   * @param opts
   */
  async notify(title, body = '', url = undefined, opts = {}) {
    let n = new Notification();
    n = Object.assign(n, opts);
    n.title = title;
    n.body = body;
    if (url) n.openURL = url;
    return await n.schedule();
  }

  /**
   * 给图片加一层半透明遮罩
   * @param {Image} img 要处理的图片
   * @param {string} color 遮罩背景颜色
   * @param {float} opacity 透明度
   */
  async shadowImage(img, color = '#000000', opacity = 0.7) {
    let ctx = new DrawContext();
    // 获取图片的尺寸
    ctx.size = img.size;

    ctx.drawImageInRect(img, new Rect(0, 0, img.size['width'], img.size['height']));
    ctx.setFillColor(new Color(color, opacity));
    ctx.fillRect(new Rect(0, 0, img.size['width'], img.size['height']));

    return ctx.getImage();
  }

  /**
   * 获取当前插件的设置
   * @param {boolean} json 是否为json格式
   */
  getSettings(json = true) {
    let res = json ? {} : '';
    let cache = '';
    if (Keychain.contains(this.SETTING_KEY)) {
      cache = Keychain.get(this.SETTING_KEY);
    }
    if (json) {
      try {
        res = JSON.parse(cache);
      } catch (e) {
      }
    } else {
      res = cache;
    }

    return res;
  }

  /**
   * 存储当前设置
   * @param {boolean} notify 是否通知提示
   */
  saveSettings(notify = true) {
    let res = (typeof this.settings === 'object') ? JSON.stringify(this.settings) : String(this.settings);
    Keychain.set(this.SETTING_KEY, res);
    if (notify) this.notify('设置成功', '桌面组件稍后将自动刷新');
  }

  /**
   * md5 加密
   * @param string
   * @returns {string}
   */
  md5(string) {
    const safeAdd = (x, y) => {
      let lsw = (x & 0xFFFF) + (y & 0xFFFF);
      return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xFFFF);
    };
    const bitRotateLeft = (num, cnt) => (num << cnt) | (num >>> (32 - cnt));
    const md5cmn = (q, a, b, x, s, t) => safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b),
      md5ff = (a, b, c, d, x, s, t) => md5cmn((b & c) | ((~b) & d), a, b, x, s, t),
      md5gg = (a, b, c, d, x, s, t) => md5cmn((b & d) | (c & (~d)), a, b, x, s, t),
      md5hh = (a, b, c, d, x, s, t) => md5cmn(b ^ c ^ d, a, b, x, s, t),
      md5ii = (a, b, c, d, x, s, t) => md5cmn(c ^ (b | (~d)), a, b, x, s, t);
    const firstChunk = (chunks, x, i) => {
      let [a, b, c, d] = chunks;
      a = md5ff(a, b, c, d, x[i + 0], 7, -680876936);
      d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);

      a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);

      a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);

      a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);

      return [a, b, c, d];
    },
      secondChunk = (chunks, x, i) => {
        let [a, b, c, d] = chunks;
        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, x[i], 20, -373897302);

        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);

        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);

        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);

        return [a, b, c, d];
      },
      thirdChunk = (chunks, x, i) => {
        let [a, b, c, d] = chunks;
        a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);

        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);

        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, x[i], 11, -358537222);
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);

        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);

        return [a, b, c, d];
      },
      fourthChunk = (chunks, x, i) => {
        let [a, b, c, d] = chunks;
        a = md5ii(a, b, c, d, x[i], 6, -198630844);
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);

        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);

        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);

        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
        return [a, b, c, d];
      };
    const binlMD5 = (x, len) => {
      /* append padding */
      x[len >> 5] |= 0x80 << (len % 32);
      x[(((len + 64) >>> 9) << 4) + 14] = len;
      let commands = [firstChunk, secondChunk, thirdChunk, fourthChunk],
        initialChunks = [
          1732584193,
          -271733879,
          -1732584194,
          271733878
        ];
      return Array.from({ length: Math.floor(x.length / 16) + 1 }, (v, i) => i * 16)
        .reduce((chunks, i) => commands
          .reduce((newChunks, apply) => apply(newChunks, x, i), chunks.slice())
          .map((chunk, index) => safeAdd(chunk, chunks[index])), initialChunks);

    };
    const binl2rstr = input => Array(input.length * 4).fill(8).reduce((output, k, i) => output + String.fromCharCode((input[(i * k) >> 5] >>> ((i * k) % 32)) & 0xFF), '');
    const rstr2binl = input => Array.from(input).map(i => i.charCodeAt(0)).reduce((output, cc, i) => {
      let resp = output.slice();
      resp[(i * 8) >> 5] |= (cc & 0xFF) << ((i * 8) % 32);
      return resp;
    }, []);
    const rstrMD5 = string => binl2rstr(binlMD5(rstr2binl(string), string.length * 8));
    const rstr2hex = input => {
      const hexTab = (pos) => '0123456789abcdef'.charAt(pos);
      return Array.from(input).map(c => c.charCodeAt(0)).reduce((output, x, i) => output + hexTab((x >>> 4) & 0x0F) + hexTab(x & 0x0F), '');
    };
    const str2rstrUTF8 = unicodeString => {
      if (typeof unicodeString !== 'string') throw new TypeError('parameter ‘unicodeString’ is not a string');
      const cc = c => c.charCodeAt(0);
      return unicodeString
        .replace(/[\u0080-\u07ff]/g,  // U+0080 - U+07FF => 2 bytes 110yyyyy, 10zzzzzz
          c => String.fromCharCode(0xc0 | cc(c) >> 6, 0x80 | cc(c) & 0x3f))
        .replace(/[\u0800-\uffff]/g,  // U+0800 - U+FFFF => 3 bytes 1110xxxx, 10yyyyyy, 10zzzzzz
          c => String.fromCharCode(0xe0 | cc(c) >> 12, 0x80 | cc(c) >> 6 & 0x3F, 0x80 | cc(c) & 0x3f));
    };
    const rawMD5 = s => rstrMD5(str2rstrUTF8(s));
    const hexMD5 = s => rstr2hex(rawMD5(s));
    return hexMD5(string);
  }
}

// @base.end
// 运行环境
// @running.start
const Running = async (Widget, default_args = '') => {
  let M = null;
  // 判断hash是否和当前设备匹配
  if (config.runsInWidget) {
    M = new Widget(args.widgetParameter || '');
    const W = await M.render();
    Script.setWidget(W);
    Script.complete();
  } else {
    let { act, data, __arg, __size } = args.queryParameters;
    M = new Widget(__arg || default_args || '');
    if (__size) M.init(__size);
    if (!act || !M['_actions']) {
      // 弹出选择菜单
      const actions = M['_actions'];
      const _actions = [];
      const alert = new Alert();
      alert.title = M.name;
      alert.message = M.desc;
      for (let _ in actions) {
        alert.addAction(_);
        _actions.push(actions[_]);
      }
      alert.addCancelAction('取消操作');
      const idx = await alert.presentSheet();
      if (_actions[idx]) {
        const func = _actions[idx];
        await func();
      }
      return;
    }
    let _tmp = act.split('-').map(_ => _[0].toUpperCase() + _.substr(1)).join('');
    let _act = `action${_tmp}`;
    if (M[_act] && typeof M[_act] === 'function') {
      const func = M[_act].bind(M);
      await func(data);
    }
  }
};


const AUDI_SERVER_API = {
  login: 'https://audi2c.faw-vw.com/capi/v1/user/login',
  token: 'https://mbboauth-1d.prd.cn.vwg-connect.cn/mbbcoauth/mobile/oauth2/v1/token',
  mine: 'https://audi2c.faw-vw.com/capi/v1/user/mine',
  mal1aVehiclesStatus: vin => `https://mal-1a.prd.cn.vwg-connect.cn/api/bs/vsr/v1/vehicles/${vin}/status`,
  mal1aVehiclesPosition: vin => `https://mal-1a.prd.cn.vwg-connect.cn/api/bs/cf/v1/vehicles/${vin}/position`,
};

const REQUEST_HEADER = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'MyAuDi/3.0.2 CFNetwork/1325.0.1 Darwin/21.1.0',
  'X-Client-ID': 'de6d8b23-792f-47b8-82f4-e4cc59c2916e'
};
const DEFAULT_MY_CAR_PHOTO = 'https://sf6-cdn-tos.huoshanstatic.com/obj/maat-public/img/cWlhb3lpeHVhbg/file_17d888b9d0b68.png';
const DEFAULT_AUDI_LOGO = 'https://sf3-cdn-tos.huoshanstatic.com/obj/maat-public/img/cWlhb3lpeHVhbg/file_17d88fbd30c71.png';
const GLOBAL_USER_DATA = {
  seriesName: '',
  modelShortName: '',
  vin: '',
  engineNo: '',
  plateNo: '', // 车牌号
  endurance: 0, // NEDC 续航
  fuelLevel: 0, // 汽油 单位百分比
  mileage: 0, // 总里程
  updateDate: new Date(), // 更新时间
  carLocation: '',
  longitude: '',
  latitude: '',
  isLocked: true, // false = 没锁车 true = 已锁车
  doorStatus: [],
  windowStatus: [],
};
const AUDI_AMAP_KEY = 'c078fb16379c25bc0aad8633d82cf1dd';

const FONT_NORMAL = 'Audi Type Normal';
const FONT_BOLD = 'Audi Type Bold';
const FONT_EXTENDED_NOMAL = 'Audi Type Extended Normal';
const FONT_EXTENDED_BOLD = 'Audi Type Extended Bold';

class Widget extends Base {

  /**
   * 传递给组件的参数，可以是桌面 Parameter 数据，也可以是外部如 URLScheme 等传递的数据
   * @param {string} arg 自定义参数
   */
  constructor(arg) {
    super(arg);
    if (config.runsInApp) {
      if (!Keychain.contains('authToken')) {
        this.registerAction('账户登录', this.actionAccountSettings);
      } else {
        this.registerAction('个性化配置', this.preferenceSettings);
        this.registerAction('当前位置', this.currentLocation);
        this.registerAction('刷新数据', this.actionLogAction);
        this.registerAction('退出登录', this.actionLogOut);
        this.registerAction('退出登录', this.actionLogOut);
      }
    }
  }

  /**
   * 设置账号数据
   * @returns {Promise<void>}
   */
  async actionAccountSettings() {
    const alert = new Alert();
    alert.title = '一汽奥迪账户登录';
    // alert.message = '登录一汽奥迪账号展示车辆数据'
    alert.addTextField('一汽奥迪账号', this.settings['username']);
    alert.addSecureTextField('一汽奥迪密码', this.settings['password']);
    alert.addAction('确定');
    alert.addCancelAction('取消');

    const id = await alert.presentAlert();
    if (id === -1) return;
    this.settings['username'] = alert.textFieldValue(0);
    this.settings['password'] = alert.textFieldValue(1);
    this.saveSettings();
    console.log('开始进行用户登录');
    await this.handleAudiLogin();
  }

  async preferenceSettings() {
    const alert = new Alert()
    alert.title = '个性化配置'
    // alert.message = '根据您的喜好设置，更好展示组件数据'

    const menuList = [{
      name: 'myCarName',
      text: '自定义车辆名称',
      icon: '💡'
      // }, {
      //   name: 'myCarModelName',
      //   text: '自定义车辆功率',
      //   icon: '🛻'
    }, {
      name: 'myCarPhoto',
      text: '自定义车辆照片',
      icon: '🚙'
    // }, {
    //   name: 'backgroundImage',
    //   text: '自定义组件背景',
    //   icon: '🎨'
      // }, {
      //   name: 'myOne',
      //   text: '一言一句',
      //   icon: '📝'
    // }, {
    //   name: 'aMapKey',
    //   text: '高德地图密钥',
    //   icon: '🎯'
      // }, {
      //   name: 'showLocation',
      //   text: '设置车辆位置',
      //   icon: '✈️'
      // }, {
      //   name: 'showPlate',
      //   text: '设置车牌显示',
      //   icon: '🚘'
    }]

    menuList.forEach(item => {
      alert.addAction(item.icon + ' ' + item.text);
    });

    alert.addCancelAction('取消设置');
    const id = await alert.presentSheet();
    if (id === -1) return;
    await this.actionPreferenceSettings(menuList[id].name);
  }

  async actionPreferenceSettings(type) {
    switch (type) {
      case 'myCarName': {
        const alert = new Alert();
        alert.title = '车辆名称';
        // alert.message = '如果您不喜欢系统返回的名称可以自己定义名称'
        alert.addTextField('请输入自定义名称', this.settings['myCarName']);
        alert.addAction('确定');
        alert.addCancelAction('取消');

        const id = await alert.presentAlert();
        if (id !== -1) {
          this.settings['myCarName'] = alert.textFieldValue(0);
          this.saveSettings();
        }
        break;
      }
      case 'myCarPhoto': {
        const alert = new Alert();
        alert.title = '车辆图片';
        // alert.message = '请在相册选择您最喜欢的车辆图片以便展示到小组件上，最好是全透明背景PNG图。'
        alert.addAction('选择照片');
        alert.addCancelAction('取消');

        const id = await alert.presentAlert();
        if (id !== -1) {
          try {
            const image = await Photos.fromLibrary();
            await Files.writeImage(this.filePath('myCarPhoto'), image);
            this.settings['myCarPhoto'] = this.filePath('myCarPhoto');
            this.saveSettings();
          } catch (error) {
            // 取消图片会异常 暂时不用管
          }
        }
        break;
      }
      case 'backgroundImage': {

        break;
      }
      case 'aMapKey': {

        break;
      }
      default:
        break;
    }
  }

  /**
   * 渲染函数，函数名固定
   * 可以根据 this.widgetFamily 来判断小组件尺寸，以返回不同大小的内容
   */
  async render() {
    const data = await this.getData();
    if (data && typeof data === 'object') {
      switch (this.widgetFamily) {
        case 'large':
          return await this.renderMedium(data);
        case 'medium':
          return await this.renderMedium(data);
        default:
          return await this.renderSmall(data);
      }
    }
    return await this.renderError(data + '');
  }

  formatStatusLabel(data) {
    // 格式化时间
    const formatter = new DateFormatter();
    formatter.dateFormat = "H:mm";
    const updateDate = new Date(data.updateDate);
    const updateDateString = formatter.string(updateDate);
    const now = Date.now();
    const diff = Math.round((now - updateDate) / 1000);
    return {
      text: `${updateDateString}更新`,
      diff,
    };
    // const updateDate = new Date(data.updateDate).getTime();
    // if (diff < 60) {
    //   return '刚刚';
    // }
    // if (diff >= 86400) {
    //   return Math.round(diff / 86400) + '天前';
    // }
    // const mins = diff / 60;
    // const hours = Math.round(mins / 60);
    // if (hours === 0) {
    //   return Math.floor(mins) + '分钟前';
    // }
    // return Math.floor(hours) + '小时前';
  }

  /**
   * 渲染小尺寸组件
   * @param {Object} data
   * @returns {Promise<ListWidget>}
   */
  async renderSmall(data) {
    let w = new ListWidget();
    w.backgroundGradient = this.getBackgroundColor();
    const fontColor = new Color('#000000', 1);
    const dangerColor = new Color('f53f3f', 1);
    const paddingLeft = 0; //Math.round(width * 0.07);
    const topBox = w.addStack();
    const topBoxLeft = topBox.addStack();
    // ---顶部左边部件---// 
    const carInfoContainer = topBoxLeft.addStack();
    carInfoContainer.setPadding(0, paddingLeft, 0, 0);
    const kmText = carInfoContainer.addText(data.endurance);
    kmText.font = new Font(FONT_BOLD, 30);
    kmText.textColor = fontColor;
    const levelContainer = carInfoContainer.addStack();
    levelContainer.setPadding(8, 0, 0, 0);
    const levelText = levelContainer.addText(` km/${data.fuelLevel}%`);
    levelText.font = new Font(FONT_NORMAL, 13);
    levelText.textColor = fontColor;
    levelText.textOpacity = 0.6;
    carInfoContainer.centerAlignContent();
    const vehicleNameContainer = w.addStack();
    vehicleNameContainer.setPadding(0, paddingLeft, 0, 0);
    let vehicleNameStr = data.seriesName;
    const vehicleNameText = vehicleNameContainer.addText(vehicleNameStr);
    vehicleNameText.leftAlignText();
    vehicleNameText.font = new Font(FONT_EXTENDED_NOMAL, 16);
    vehicleNameText.textColor = fontColor;
    // ---中间部件---
    const carStatusContainer = w.addStack();
    carStatusContainer.setPadding(2, paddingLeft, 0, 0);
    const carStatusBox = carStatusContainer.addStack();
    carStatusBox.setPadding(2, 3, 2, 3);
    carStatusBox.layoutHorizontally();
    carStatusBox.centerAlignContent();
    carStatusBox.cornerRadius = 4;
    carStatusBox.backgroundColor = new Color("#ffffff", 0.4);
    let statusText = '已锁车'
    let statusTextColor = fontColor;
    if (data.doorStatus.length !== 0) {
      statusText = data.doorStatus.map(i => i.name).join('、') + '已开';
      statusTextColor = dangerColor;
    } else if (data.windowStatus.length !== 0) {
      statusText = data.windowStatus.map(i => i.name).join('、') + '已开';
      statusTextColor = dangerColor;
    } else if (!data.isLocked) {
      statusText = '未锁车';
      statusTextColor = dangerColor;
    }
    let carStatusTxt = carStatusBox.addText(statusText);
    carStatusTxt.font = new Font(FONT_NORMAL, 10);
    carStatusTxt.textColor = statusTextColor;
    carStatusTxt.textOpacity = 0.7;
    carStatusBox.addSpacer(5);
    let statusLabel = this.formatStatusLabel(data);
    const updateTxt = carStatusBox.addText(statusLabel.text);
    updateTxt.font = new Font(FONT_NORMAL, 10);
    updateTxt.textColor = statusLabel.diff >= 86400 ? dangerColor : new Color("#000000", 0.3);
    updateTxt.textOpacity = 0.5;
    // ---中间部件完---
    w.addSpacer();
    // ---底部部件---
    const carImageContainer = w.addStack();
    carImageContainer.setPadding(5, 0, 0, 0);
    let image = await this.getImageByUrl(DEFAULT_MY_CAR_PHOTO);
    carImageContainer.centerAlignContent();
    const imageBox = carImageContainer.addImage(image);
    const _s = 1917 / 742;
    imageBox.imageSize = new Size(_s * 50, 50); // 1917 × 742
    // ---底部部件完---
    return w;
  }

  /**
   * 渲染中尺寸组件
   * @param {Object} data
   * @returns {Promise<ListWidget>}
   */
  async renderMedium(data) {
    const widget = new ListWidget();
    return widget;
  }

  /**
   * 渲染错误信息
   * @param data
   * @returns {Promise<ListWidget>}
   */
  async renderError(data) {
    const widget = new ListWidget();
    widget.backgroundImage = await this.shadowImage(await this.getImageByUrl(DEFAULT_MY_CAR_PHOTO));

    const text = widget.addText(data);
    switch (this.widgetFamily) {
      case 'large':
        text.font = Font.blackSystemFont(18);
        break;
      case 'medium':
        text.font = Font.blackSystemFont(18);
        break;
      case 'small':
        text.font = Font.blackSystemFont(12);
        break;
    }
    text.textColor = Color.red();
    text.centerAlignText();

    return widget;
  }

  /**
   * 渐变色
   * @returns {LinearGradient}
   */
  getBackgroundColor() {
    const bgColor = new LinearGradient();
    bgColor.colors = [new Color('#aaa9ad', 1), new Color('#ffffff', 1)];
    bgColor.locations = [0.0, 1.0];
    return bgColor;
  }

  /**
   * 处理数据业务
   * @returns {Promise<{Object}>}
   */
  async bootstrap() {
    try {
      const getUserMineData = JSON.parse(Keychain.get('userMineData'));
      const getVehicleData = getUserMineData.vehicleDto;

      // 车辆名称
      GLOBAL_USER_DATA.seriesName = this.settings['myCarName'] ? this.settings['myCarName'] : getVehicleData?.seriesName;
      // 车辆功率类型
      GLOBAL_USER_DATA.modelShortName = this.settings['myCarModelName'] ? this.settings['myCarModelName'] : getVehicleData?.carModelName;
      if (getVehicleData.vin) GLOBAL_USER_DATA.vin = getVehicleData?.vin; // 车架号
      if (getVehicleData.engineNo) GLOBAL_USER_DATA.engineNo = getVehicleData?.engineNo; // 发动机型号
      if (getVehicleData.plateNo) GLOBAL_USER_DATA.plateNo = getVehicleData?.plateNo; // 车牌号
    } catch (error) {
      return '获取用户信息失败，' + error;
    }

    try {
      const getVehiclesStatus = await this.handleVehiclesStatus();
      const getVehicleResponseData = getVehiclesStatus?.StoredVehicleDataResponse?.vehicleData?.data;
      const getVehiclesStatusArr = getVehicleResponseData ? getVehicleResponseData : [];
      const getCarStatusArr = getVehiclesStatusArr.find(i => i.id === '0x0301FFFFFF')?.field;
      const enduranceVal = getCarStatusArr.find(i => i.id === '0x0301030005')?.value; // 燃料总行程
      // 判断电车
      // 0x0301030002 = 电池
      // 0x030103000A = 燃料
      const fuelLevelVal = getCarStatusArr.find(i => i.id === '0x0301030002')?.value ? getCarStatusArr.find(i => i.id === '0x0301030002')?.value : getCarStatusArr.find(i => i.id === '0x030103000A')?.value;
      const mileageVal = getVehiclesStatusArr.find(i => i.id === '0x0101010002')?.field[0]?.value; // 总里程
      // 更新时间
      const updateDate = getVehiclesStatusArr.find(i => i.id === '0x0101010002')?.field[0]?.tsCarSentUtc;

      // 检查门锁 车门 车窗等状态
      const isLocked = await this.getCarIsLocked(getCarStatusArr);
      const doorStatusArr = await this.getCarDoorStatus(getCarStatusArr);
      const windowStatusArr = await this.getCarWindowStatus(getCarStatusArr);
      const equipmentStatusArr = [...doorStatusArr, ...windowStatusArr].map(i => i.name);
      // NEDC 续航 单位 km
      if (enduranceVal) GLOBAL_USER_DATA.endurance = enduranceVal;
      // 燃料 单位百分比
      if (fuelLevelVal) GLOBAL_USER_DATA.fuelLevel = fuelLevelVal;
      // 总里程
      if (mileageVal) GLOBAL_USER_DATA.mileage = mileageVal;
      if (updateDate) GLOBAL_USER_DATA.updateDate = updateDate;
      GLOBAL_USER_DATA.isLocked = isLocked;// 车辆状态 true = 已锁车
      GLOBAL_USER_DATA.doorStatus = doorStatusArr;
      GLOBAL_USER_DATA.windowStatus = windowStatusArr;
    } catch (error) {
      return '获取车辆状态失败，请确保是否已经激活车联网服务，' + error;
    }
    return GLOBAL_USER_DATA;
  }

  /**
   * 获取数据
   */
  async getData() {
    // 判断用户是否已经登录
    return Keychain.contains('userBaseInfoData') ? await this.bootstrap() : false;
  }

  /**
   * 获取车辆锁车状态
   * @param {Array} arr
   * @return Promise<{boolean}> true = 锁车 false = 没有完全锁车
   */
  async getCarIsLocked(arr) {
    // 先判断车辆是否锁定
    const lockArr = ['0x0301040001', '0x0301040004', '0x0301040007', '0x030104000A', '0x030104000D'];
    // 筛选出对应的数组
    const filterArr = arr.filter(item => lockArr.some(i => i === item.id));
    // 判断是否都锁门
    // value === 2 锁门
    // value === 3 未锁门
    return filterArr.every(item => item.value === '2');
  }

  /**
   * 获取车辆车门/引擎盖/后备箱状态
   * @param {Array} arr
   * @return Promise<[]<{
   *   id: string
   *   name: string
   * }>>
   */
  async getCarDoorStatus(arr) {
    const doorArr = [
      {
        id: '0x0301040002',
        name: '左前门'
      }, {
        id: '0x0301040005',
        name: '左后门'
      }, {
        id: '0x0301040008',
        name: '右前门'
      }, {
        id: '0x030104000B',
        name: '右后门'
      }, {
        id: '0x0301040011',
        name: '引擎盖'
      }, {
        id: '0x030104000E',
        name: '后备箱'
      }
    ];
    // 筛选出对应的数组
    const filterArr = arr.filter(item => doorArr.some(i => i.id === item.id));
    // 筛选出没有关门id
    const result = filterArr.filter(item => item.value === '2');
    // 返回开门的数组
    return doorArr.filter(i => result.some(x => x.id === i.id));
  }

  /**
   * 获取车辆车窗/天窗状态
   * @param {Array} arr
   * @return Promise<[]<{
   *   id: string
   *   name: string
   * }>>
   */
  async getCarWindowStatus(arr) {
    const windowArr = [
      {
        id: '0x0301050001',
        name: '左前窗'
      }, {
        id: '0x0301050003',
        name: '左后窗'
      }, {
        id: '0x0301050005',
        name: '右前窗'
      }, {
        id: '0x0301050007',
        name: '右后窗'
      }, {
        id: '0x030105000B',
        name: '天窗'
      }
    ];
    // 筛选出对应的数组
    const filterArr = arr.filter(item => windowArr.some(i => i.id === item.id));
    // 筛选出没有关门id
    const result = filterArr.filter(item => item.value === '2');
    // 返回开门的数组
    return windowArr.filter(i => result.some(x => x.id === i.id));
  }

  /**
   * 获取用户车辆照片
   * @returns {Promise<Image|*>}
   */
  async getMyCarPhoto() {
    let myCarPhoto = await this.getImageByUrl(DEFAULT_MY_CAR_PHOTO);
    // if (this.settings['myCarPhoto']) myCarPhoto = await Image.fromFile(this.settings['myCarPhoto'])
    if (this.settings['myCarPhoto']) myCarPhoto = await Image.fromData(Data.fromBase64String(this.settings['myCarPhoto']));
    return myCarPhoto;
  }

  /**
   * 登录奥迪服务器
   * @param {boolean} isDebug
   * @returns {Promise<void>}
   */
  async handleAudiLogin(isDebug = false) {
    if (!Keychain.contains('userBaseInfoData')) {
      const options = {
        url: AUDI_SERVER_API.login,
        method: 'POST',
        headers: REQUEST_HEADER,
        body: JSON.stringify({
          loginChannelEnum: 'APP',
          loginTypeEnum: 'ACCOUNT_PASSWORD',
          account: this.settings['username'],
          password: this.settings['password']
        })
      };
      const response = await this.http(options);
      if (isDebug) console.log('获取登陆信息:');
      if (isDebug) console.log(response);
      // 判断接口状态
      if (response.code === 0) {
        // 登录成功 存储登录信息
        console.log('登陆成功');
        Keychain.set('userBaseInfoData', JSON.stringify(response.data));
        await this.notify('登录成功', '正在从 Audi 服务器获取车辆数据，请耐心等待！');
        // 准备交换验证密钥数据
        await this.handleAudiGetToken('userIDToken');
        await this.handleUserMineData();
      } else {
        // 登录异常
        await this.notify('登录失败', response.message);
        console.error('用户登录失败：' + response.message);
      }
    } else {
      // 已存在用户信息
      if (isDebug) console.log('检测本地缓存已有登陆数据:');
      if (isDebug) console.log(Keychain.get('userBaseInfoData'));
      await this.handleAudiGetToken('userIDToken');
      await this.handleUserMineData();
    }
  }

  // /**
  //  * 获取车辆基本信息
  //  * 该接口返回绑定车辆的侧身照片，不过有白底背景
  //  * 后期可以利用抠图api完善
  //  * @returns {Promise<void>}
  //  */
  // async handleQueryDefaultVehicleData() {
  //   if (!Keychain.contains('defaultVehicleData')) {
  //     if (!Keychain.contains('userBaseInfoData')) {
  //       return console.error('获取密钥数据失败，没有拿到用户登录信息，请重新登录再重试！')
  //     }
  //     const getUserBaseInfoData = JSON.parse(Keychain.get('userBaseInfoData'))
  //     //服务器获取签名
  //     const signOptions = {
  //       url: SIGN_SERVER_API.sign,
  //       method: 'POST',
  //       headers: {
  //         ...{
  //           Platform: "1"
  //         },
  //         ...REQUEST_HEADER
  //       }
  //     }
  //     const signatureREesponse = await this.http(signOptions)
  //     if (signatureREesponse.code !== 0) {
  //       return console.error(signatureREesponse.data)
  //     } else {
  //       const data = signatureREesponse.data
  //       const options = {
  //         url: AUDI_SERVER_API.vehicleServer(data.appkey, data.nonce, data.sign, data.signt),
  //         method: 'GET',
  //         headers: {
  //           ...{
  //             token: 'Bearer ' + getUserBaseInfoData.accessToken
  //           },
  //           ...REQUEST_HEADER
  //         }
  //       }
  //       const response = await this.http(options)
  //       // 判断接口状态
  //       if (response.status === 'SUCCEED') {
  //         // 存储车辆信息
  //         console.log(response)
  //         // Keychain.set('defaultVehicleData', JSON.stringify(response.data))
  //         // Keychain.set('myCarVIN', response.data?.vin)
  //         console.log('车辆基本信息获取成功')
  //         // 准备交换验证密钥数据
  //         await this.handleAudiGetToken('userRefreshToken')
  //       } else {
  //         // 获取异常
  //         await console.error('车辆信息获取失败，请稍后重新登录再重试！')
  //       }
  //     }
  //   }
  // }

  /**
   * 获取用户信息
   * @param {boolean} isDebug
   * @returns {Promise<void>}
   */
  async handleUserMineData(isDebug = false) {
    if (!Keychain.contains('userMineData')) {
      const getUserBaseInfoData = JSON.parse(Keychain.get('userBaseInfoData'));
      const options = {
        url: AUDI_SERVER_API.mine,
        method: 'GET',
        headers: {
          ...{
            'X-ACCESS-TOKEN': getUserBaseInfoData.accessToken,
            'X-CHANNEL': 'IOS',
            'x-mobile': getUserBaseInfoData.user.mobile
          },
          ...REQUEST_HEADER
        }
      };
      const response = await this.http(options);
      if (isDebug) console.log('获取用户信息：');
      if (isDebug) console.log(response);
      // 判断接口状态
      if (response.code === 0) {
        // 存储车辆信息
        console.log('获取用户基本信息成功');
        Keychain.set('userMineData', JSON.stringify(response.data));
        Keychain.set('myCarVIN', response.data?.vehicleDto?.vin);
        // 准备交换验证密钥数据
        await this.handleAudiGetToken('userRefreshToken');
      } else {
        // 获取异常
        console.error('获取用户基本信息失败，准备重新登录获取密钥');
        if (Keychain.contains('userBaseInfoData')) Keychain.remove('userBaseInfoData');
        // 重新登录
        await this.handleAudiLogin();
      }
    } else {
      console.log('userMineData 信息已存在，开始获取 userRefreshToken');
      if (isDebug) console.log(Keychain.get('userMineData'));
      await this.handleAudiGetToken('userRefreshToken');
    }
  }

  /**
   * 获取密钥数据
   * @param {'userIDToken' | 'userRefreshToken'} type
   * @param {boolean} forceRefresh
   * @returns {Promise<void>}
   */
  async handleAudiGetToken(type, forceRefresh = false) {
    if (forceRefresh || !Keychain.contains(type)) {
      if (type === 'userIDToken' && !Keychain.contains('userBaseInfoData')) {
        return console.error('获取密钥数据失败，没有拿到用户登录信息，请重新登录再重试！');
      }
      if (type === 'userRefreshToken' && !Keychain.contains('userIDToken')) {
        return console.error('获取密钥数据失败，没有拿到用户 ID Token，请重新登录再重试！');
      }

      // 根据交换token请求参数不同
      let requestParams = '';
      const getUserBaseInfoData = JSON.parse(Keychain.get('userBaseInfoData'));
      if (type === 'userIDToken') {
        requestParams = `grant_type=${encodeURIComponent('id_token')}&token=${encodeURIComponent(getUserBaseInfoData.idToken)}&scope=${encodeURIComponent('sc2:fal')}`;
      } else if (type === 'userRefreshToken') {
        const getUserIDToken = JSON.parse(Keychain.get('userIDToken'));
        requestParams = `grant_type=${encodeURIComponent('refresh_token')}&token=${encodeURIComponent(getUserIDToken.refresh_token)}&scope=${encodeURIComponent('sc2:fal')}&vin=${Keychain.get('myCarVIN')}`;
      }

      const options = {
        url: AUDI_SERVER_API.token,
        method: 'POST',
        headers: {
          'X-Client-ID': 'de6d8b23-792f-47b8-82f4-e4cc59c2916e',
          'User-Agent': 'MyAuDi/3.0.2 CFNetwork/1325.0.1 Darwin/21.1.0',
        },
        body: requestParams
      };
      const response = await this.http(options);
      // 判断接口状态
      if (response.error) {
        switch (response.error) {
          case 'invalid_grant':
            console.error('IDToken 数据过期，正在重新获取数据中，请耐心等待...');
            await this.handleAudiGetToken('userIDToken', true);
            break;
        }
      } else {
        // 获取密钥数据成功，存储数据
        Keychain.set(type, JSON.stringify(response));
        console.log('当前密钥数据获取成功：' + type);
        if (type === 'userRefreshToken') {
          Keychain.set('authToken', response.access_token);
          console.log('authToken 密钥设置成功');
          // 正式获取车辆信息
          await this.bootstrap();
        }
      }
    } else {
      // 已存在的时候
      console.log(type + ' 信息已存在，开始 bootstrap() 函数');
      if (type === 'userRefreshToken') await this.bootstrap();
    }
  }

  /**
   * 获取车辆当前状态
   * 需要实时获取
   * @param {boolean} isDebug
   * @returns {Promise<string | void>}
   */
  async handleVehiclesStatus(isDebug = false) {
    let url = AUDI_SERVER_API.mal1aVehiclesStatus;
    const options = {
      url: url(Keychain.get('myCarVIN')),
      method: 'GET',
      headers: {
        ...{
          'Authorization': 'Bearer ' + Keychain.get('authToken'),
          'X-App-Name': 'MyAuDi',
          'X-App-Version': '113',
          'Accept-Language': 'de-DE'
        },
        ...REQUEST_HEADER
      }
    };
    const response = await this.http(options);
    if (isDebug) console.log('获取车辆状态信息：');
    if (isDebug) console.log(response);
    // 判断接口状态
    if (response.error) {
      // 接口异常
      console.error('vehiclesStatus 接口异常' + response.error.errorCode + ' - ' + response.error.description);
      switch (response.error.errorCode) {
        case 'gw.error.authentication':
          console.error('获取车辆状态失败 error: ' + response.error.errorCode);
          await this.handleAudiGetToken('userRefreshToken', true);
          await this.handleVehiclesStatus();
          break;
        case 'mbbc.rolesandrights.unauthorized':
          await this.notify('unauthorized 错误', '请检查您的车辆是否已经开启车联网服务，请到一汽奥迪应用查看！');
          break;
        case 'mbbc.rolesandrights.unknownService':
          await this.notify('unknownService 错误', '请检查您的车辆是否已经开启车联网服务，请到一汽奥迪应用查看！');
          break;
        default:
          await this.notify('未知错误' + response.error.errorCode, '未知错误:' + response.error.description);
      }
      if (Keychain.contains('vehiclesStatusResponse')) {
        return JSON.parse(Keychain.get('vehiclesStatusResponse'));
      }
    } else {
      // 接口获取数据成功
      Keychain.set('vehiclesStatusResponse', JSON.stringify(response));
      return response;
    }
  }

  /**
   * 获取车辆当前经纬度
   * 需要实时获取
   * @param {boolean} isDebug
   * @returns {Promise<string>}
   */
  async handleVehiclesPosition(isDebug = false) {
    let url = AUDI_SERVER_API.mal1aVehiclesPosition;
    const options = {
      url: url(Keychain.get('myCarVIN')),
      method: 'GET',
      headers: {
        ...{
          'Authorization': 'Bearer ' + Keychain.get('authToken'),
          'X-App-Name': 'MyAuDi',
          'X-App-Version': '113',
          'Accept-Language': 'de-DE'
        },
        ...REQUEST_HEADER
      }
    };
    let response = {};

    try {
      response = await this.http(options);
    } catch (error) {
      return '暂无位置';
    }

    if (isDebug) console.log('获取车辆位置信息：');
    if (isDebug) console.log(response);
    // 判断接口状态
    if (response.error) {
      // 接口异常
      console.error('vehiclesPosition 接口异常' + response.error.errorCode + ' - ' + response.error.description);
      switch (response.error.errorCode) {
        case 'gw.error.authentication':
          console.error('获取车辆位置失败 error: ' + response.error.errorCode);
          await this.handleAudiGetToken('userRefreshToken', true);
          await this.handleVehiclesPosition();
          break;
        case 'mbbc.rolesandrights.servicelocallydisabled':
          // 本地车辆定位服务未开启
          return '请检查车辆位置是否开启';
      }
    } else {
      // 接口获取数据成功储存接口数据
      if (response.storedPositionResponse) {
        Keychain.set('storedPositionResponse', JSON.stringify(response));
        Keychain.set('carPosition', JSON.stringify({
          longitude: response.storedPositionResponse.position.carCoordinate.longitude,
          latitude: response.storedPositionResponse.position.carCoordinate.latitude
        }));
      } else if (response.findCarResponse) {
        Keychain.set('findCarResponse', JSON.stringify(response));
        Keychain.set('carPosition', JSON.stringify({
          longitude: response.findCarResponse.Position.carCoordinate.longitude,
          latitude: response.findCarResponse.Position.carCoordinate.latitude
        }));
      }
      return Keychain.get('carPosition');
    }
  }

  /**
   * 获取车辆地址
   * @returns {Promise<string>}
   */
  async handleGetCarAddress() {
    if (!Keychain.contains('storedPositionResponse') && !Keychain.contains('carPosition')) {
      console.error('获取车辆经纬度失败，请退出登录再登录重试！');
      return '暂无位置信息';
    }
    const carPosition = JSON.parse(Keychain.get('carPosition'));
    const longitude = parseInt(carPosition.longitude, 10) / 1000000;
    const latitude = parseInt(carPosition.latitude, 10) / 1000000;

    // longitude latitude 可能会返回负数的问题
    // 直接返回缓存数据
    if (longitude < 0 || latitude < 0) return '暂无位置信息';

    const aMapKey = this.settings['aMapKey'] ? this.settings['aMapKey'] : AUDI_AMAP_KEY;
    const options = {
      url: `https://restapi.amap.com/v3/geocode/regeo?key=${aMapKey}&location=${longitude},${latitude}&radius=1000&extensions=base&batch=false&roadlevel=0`,
      method: 'GET'
    };
    const response = await this.http(options);
    if (response.status === '1') {
      console.log('CarAddress:' + JSON.stringify(response));
      const address = response.regeocode.formatted_address;
      // const addressComponent = response.regeocode.addressComponent;
      // const address = (addressComponent.city + '' || addressComponent.province) +
      //   addressComponent.district +
      //   (addressComponent.streetNumber.street || '') +
      //   (addressComponent.streetNumber.number || '');
      //   // addressComponent.township;
      Keychain.set('carAddress', address);
      return address;
    } else {
      console.error('获取车辆位置失败，请检查高德地图 key 是否填写正常');
      return null;
      // if (Keychain.contains('carAddress')) {
      //   return Keychain.get('carAddress');
      // } else {
      //   return '暂无位置信息';
      // }
    }
  }

  /**
   * 登出系统
   * @returns {Promise<void>}
   */
  async actionLogOut() {
    const alert = new Alert();
    alert.title = '退出账号';
    alert.message = '您所登录的账号包括缓存本地的数据将全部删除，请慎重操作。';
    alert.addAction('登出');
    alert.addCancelAction('取消');

    const id = await alert.presentAlert();
    if (id === -1) return;

    const keys = [
      'userBaseInfoData',
      'defaultVehicleData',
      'userMineData',
      'myCarVIN',
      'authToken',
      'userIDToken',
      'userRefreshToken',
      'storedPositionResponse',
      'findCarResponse',
      'carPosition',
      'carAddress',
      'vehiclesStatusResponse',
      this.SETTING_KEY
    ];
    keys.forEach(key => {
      if (Keychain.contains(key)) {
        Keychain.remove(key);
        console.log(key + ' 缓存信息已删除');
      }
    });
    await this.notify('登出成功', '敏感信息已全部删除');
  }

  /**
   * 重载数据
   * @return {Promise<void>}
   */
  async actionLogAction() {
    const alert = new Alert();
    alert.title = '重载数据';

    const menuList = [{
      name: 'bootstrap',
      text: '全部数据'
    }, {
      name: 'handleAudiLogin',
      text: '登陆数据'
    }, {
      name: 'handleUserMineData',
      text: '用户信息数据'
    }, {
      name: 'handleVehiclesStatus',
      text: '当前车辆状态数据'
    }, {
      name: 'handleVehiclesPosition',
      text: '车辆经纬度数据'
    }
      // , {
      //   name: 'getDeviceInfo',
      //   text: '获取设备信息'
      // }
    ];

    menuList.forEach(item => {
      alert.addAction(item.text);
    });

    alert.addCancelAction('退出菜单');
    const id = await alert.presentSheet();
    if (id === -1) return;
    // 执行函数
    await this[menuList[id].name](true);
  }

  async currentLocation() {
    const account = this.settings['username'];
    const password = this.settings['password'];
    // this.notify(account + '' + password);
    console.log(this.getSettings());
    console.log(Keychain.get('authToken'));
    console.log(Keychain.get('userMineData'));
    console.log(Keychain.get('userBaseInfoData'));
    // try {
    //   const vehiclesAddress = await this.handleGetCarAddress()
    //   const vehiclesPosition = JSON.parse(await this.handleVehiclesPosition());
    //   const longitude = vehiclesPosition.longitude / 1000000; // 车辆经度
    //   const latitude = vehiclesPosition.latitude / 1000000; // 车辆纬度
    //   const cb = new CallbackURL(`baidumap://map/marker`);
    //   cb.addParameter('location', `${latitude},${longitude}`);
    //   cb.addParameter('title', vehiclesAddress || `${latitude},${longitude}`);
    //   cb.addParameter('content', `${latitude},${longitude}`);
    //   cb.addParameter('zoom', `18`);
    //   cb.addParameter('coord_type', `gcj02`);
    //   cb.addParameter('src', `ios.baidu.openAPIdemo`);
    //   cb.open();
    // } catch (error) {
    //   await this.notify('执行失败', '当前车辆处于运行状态或车辆没有上传位置信息');
    // }
  }

  /**
   * 文件路径
   * @param fileName
   * @returns {string}
   */
   filePath(fileName) {
    return Files.joinPath(Files.documentsDirectory(), fileName);
  }

  // /**
  //  * 获取设备信息
  //  * @return {Promise<void>}
  //  */
  // async getDeviceInfo() {
  //   const data = {
  //     systemVersion: Device.model() + ' ' + Device.systemName() + ' ' + Device.systemVersion(), // 系统版本号
  //     screenSize: Device.screenSize(), // 屏幕尺寸
  //     screenResolution: Device.screenResolution(), // 屏幕分辨率
  //     screenScale: Device.screenScale(), // 屏幕比例
  //     version: AUDI_VERSION // 版本号
  //   };
  //   console.log(JSON.stringify(data));
  // }

  // /**
  //  * 自定义注册点击事件，用 actionUrl 生成一个触发链接，点击后会执行下方对应的 action
  //  * @param {string} url 打开的链接
  //  */
  // async actionOpenUrl(url) {
  //   await Safari.openInApp(url, false);
  // }

  // /**
  //  * 分割字符串
  //  * @param str
  //  * @param num
  //  * @returns {*[]}
  //  */
  // splitStr2Arr(str, num) {
  //   const strArr = [];
  //   for (let i = 0, l = str.length; i < l / num; i++) {
  //     const string = str.slice(num * i, num * (i + 1));
  //     strArr.push(string);
  //   }

  //   return strArr;
  // }

  // /**
  //  * 获取动态字体颜色
  //  * @return {Color}
  //  */
  // dynamicFontColor() {
  //   const lightFontColor = this.settings['lightFontColor'] ? this.settings['lightFontColor'] : '#000000';
  //   const darkFontColor = this.settings['darkFontColor'] ? this.settings['darkFontColor'] : '#ffffff';
  //   return Color.dynamic(new Color(lightFontColor, 1), new Color(darkFontColor, 1));
  // }

  // /**
  //  * 是否开启位置显示
  //  */
  // showLocation() {
  //   return true;
  //   //     this.settings['showLocation']
  // }

  // /**
  //  * 是否开启位置显示
  //  */
  // showPlate() {
  //   return this.settings['showPlate'];
  // }
}
await Running(Widget);