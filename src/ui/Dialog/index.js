/*!
 * Dialog.js
 * @author ydr.me
 * @create 2014-10-10 22:36
 */


define(function (require, exports, module) {
    /**
     * @module ui/Dialog/index
     * @requires util/class
     * @requires util/data
     * @requires core/dom/modification
     * @requires core/dom/selector
     * @requires core/dom/attribute
     * @requires core/dom/animation
     * @requires core/event/touch
     * @requires core/event/drag
     * @requires core/navigator/compatible
     *
     * @author ydr.me
     * @create 2014-10-04 02:33
     */

    'use strict';


    require('../../core/event/drag.js');
    var style = require('text!./style.css');
    var klass = require('../../util/class.js');
    var Emitter = require('../../libs/Emitter.js');
    var modification = require('../../core/dom/modification.js');
    var selector = require('../../core/dom/selector.js');
    var attribute = require('../../core/dom/attribute.js');
    var animation = require('../../core/dom/animation.js');
    var event = require('../../core/event/touch.js');
    var data = require('../../util/data.js');
    var alienIndex = 0;
    var zIndex = 9999;
//    var html = document.documentElement;
    var body = document.body;
    var overflowClass = 'alien-ui-dialog-overflow';
    var dialogClass = 'alien-ui-dialog';
    var bodyClass = 'alien-ui-dialog-body';
    var titleClass = 'alien-ui-dialog-title';
    var closeClass = 'alien-ui-dialog-close';
    var iframeClass = 'alien-ui-dialog-iframe';
    var shakeClass = 'alien-ui-dialog-shake';
    // http://www.sitepoint.com/css3-animation-javascript-event-handlers/
    var animationendEventType = 'animationend webkitAnimationEnd oanimationend MSAnimationEnd';
    var defaults = {
        width: 500,
        height: 'auto',
        left: 'center',
        top: 'center',
        title: '无标题对话框',
        canDrag: !0,
        duration: 345,
        easing: 'ease-in-out-back',
        // 优先级2
        remote: null,
        remoteHeight: 400,
        // 优先级1
        content: null,
        // 优先级1
        isWrap: !0
    };
    // 打开的对话框队列
    var openDialogs = [];
    var dialogsMap = {};
    var Dialog = klass.create({
        STATIC: {
            /**
             * 默认配置
             * @name defaults
             * @property [width=500] {Number|String} 对话框宽度
             * @property [height="auto"] {Number|String} 对话框高度
             * @property [left="center"] {Number|String} 对话框左距离，默认水平居中
             * @property [top="center"] {Number|String} 对话框上距离，默认垂直居中（为了美观，表现为2/5处）
             * @property [title="无标题对话框"] {String|null} 对话框标题，为null时将隐藏标题栏
             * @property [canDrag=true] {Boolean} 对话框是否可以被拖拽，标题栏存在时拖动标题栏，否则拖拽整体
             * @property [duration=345] {Number} 对话框打开、关闭的动画时间，单位毫秒
             * @property [easing="ease-in-out-back"] {String} 对话框打开、关闭的动画缓冲函数
             * @property [remote=null] {null|String} 对话框打开远程地址，优先级2
             * @property [remoteHeight=400] {Number} 对话框打开远程地址的高度，单位像素
             * @property [content=null] {null|HTMLElement|Node|String} 设置对话框的内容，优先级1
             * @property [isWrap=true] {Boolean} 是否自动包裹对话框来，默认 true，优先级1

             */
            defaults: defaults
        },

        constructor: function (ele, options) {
            var the = this;


            the._$ele = selector.query(ele);

            if (!the._$ele.length) {
                throw new Error('instance element is empty');
            }

            the._$ele = the._$ele[0];
            Emitter.apply(the, arguments);
            the._options = data.extend(!0, {}, defaults, options);
            the._init();
        },


        /**
         * 初始化
         * @returns {Dialog}
         * @private
         */
        _init: function () {
            alienIndex++;

            var the = this;
            var options = the._options;
            var $bg = modification.create('div', {
                id: 'alien-ui-dialog-bg-' + alienIndex,
                'class': 'alien-ui-dialog-bg'
            });
            var $dialog = modification.create('div', {
                id: 'alien-ui-dialog-' + alienIndex,
                'class': dialogClass,
                role: 'dialog',
                draggablefor: options.title === null && options.canDrag ? 'alien-ui-dialog-' + alienIndex : null
            });
            var $bd;

            if (options.isWrap) {
                $dialog.innerHTML = '<div class="alien-ui-dialog-container">' +
                (options.title === null ? '' :
                '<div class="alien-ui-dialog-header"' +
                (options.canDrag ? ' draggablefor="alien-ui-dialog-' + alienIndex + '"' : '') +
                '>' +
                '<div class="' + titleClass + '">' + options.title + '</div>' +
                '<div class="' + closeClass + '">&times;</div>' +
                '</div>') +
                '<div class="' + bodyClass + '"></div>' +
                '</div>';
                $bd = selector.query('.' + bodyClass, $dialog)[0];
            }

            modification.insert($bg, body, 'beforeend');
            modification.insert($dialog, $bg, 'beforeend');
            the._$bg = $bg;

            the._$dialog = $dialog;
            the._hasOpen = !1;
            the._zIndex = 0;
            the._id = alienIndex;
            dialogsMap[the._id] = the;

            modification.insert(the._$ele, $bd ? $bd : $dialog, 'beforeend');

            event.on($dialog, 'click tap', '.' + closeClass, function () {
                the.close();
            });

            event.on(the._$bg, 'click tap', function (eve) {
                eve.stopPropagation();

                if (!selector.closest(eve.target, '.' + dialogClass).length) {
                    the.shake();
                }
            });

            event.on(window, animationendEventType, function () {
                attribute.removeClass(the._$dialog, shakeClass);
            });

            return the;
        },

        /**
         * 打开对话框
         * @param {Function} [callback] 打开之后回调
         * @returns {Dialog}
         */
        open: function (callback) {
            var the = this;
            var $bg = the._$bg;
            var $dialog = the._$dialog;
            var to;
            var options = the._options;
            var findIndex;

            if (the._hasOpen) {
                return the;
            }

            the._hasOpen = !0;
            findIndex = openDialogs.indexOf(the._id);

            if (findIndex > -1) {
                openDialogs.splice(findIndex, 1);
            }

            openDialogs.push(the._id);
            attribute.addClass(body, overflowClass);

            if (options.content || options.remote) {
                the._$ele.innerHTML = '';
            }

            attribute.css($bg, {
                display: 'block',
                zIndex: ++zIndex,
                opacity: 0
            });

            attribute.css($dialog, {
                display: 'block',
                visibility: 'hidden',
                width: options.width,
                height: options.height
            });

            the._zIndex = zIndex;
            to = the._position();
            to.opacity = '';
            to.transform = 'scale(1)';

            attribute.css($dialog, {
                opacity: 0,
                visibility: 'visible',
                left: to.left,
                top: to.top,
                transform: 'scale(0)'
            });

            animation.animate($bg, {
                opacity: 1
            }, {
                duration: options.duration,
                easing: options.easing
            });

            animation.animate($dialog, to, {
                duration: options.duration,
                easing: options.easing
            }, function () {
                the.emit('open');

                if (!options.content && options.remote) {
                    the.setRemote(options.remote);
                }

                if (data.type(callback) === 'function') {
                    callback.call(the);
                }
            });

            if (options.content) {
                the.setContent(options.content);
            }

            return the;
        },


        /**
         * 关闭对话框
         * @param {Function} [callback] 打开之后回调
         * @returns {Dialog}
         */
        close: function (callback) {
            var the = this;
            var $bg = the._$bg;
            var $dialog = the._$dialog;
            var options = the._options;
//            var theH = attribute.height(dialog);

            if (!the._hasOpen) {
                return the;
            }

            the._hasOpen = !1;
            openDialogs.pop();

            if (!openDialogs.length) {
                attribute.removeClass(body, overflowClass);
            }

            animation.animate($dialog, {
                opacity: 0,
                transform: 'scale(0)'
            }, {
                duration: options.duration,
                easing: options.easing
            });

            animation.animate($bg, {
                opacity: 0
            }, {
                duration: options.duration,
                easing: options.easing
            }, function () {
                attribute.css($bg, 'display', 'none');
                attribute.css($dialog, 'transform', 'scale(1)');
                the.emit('close');

                if (data.type(callback) === 'function') {
                    callback.call(the);
                }
            });

            return the;
        },


        /**
         * 重新定位对话框
         * @param {Function} [callback] 打开之后回调
         * @returns {Dialog}
         */
        position: function (callback) {
            var the = this;
            var options = the._options;
            var pos = the._position();

            animation.animate(the._$dialog, pos, {
                duration: options.duration,
                easing: options.easing
            }, function () {
                if (data.type(callback) === 'function') {
                    callback.call(the);
                }
            });

            return the;
        },


        /**
         * 对话框添加内容，并重新定位
         * @returns {Dialog}
         */
        setContent: function (content) {
            var the = this;
            var contentType = data.type(content);

            the._$ele.innerHTML = '';

            if (contentType === 'string') {
                content = modification.create('#text', content);
            }

            modification.insert(content, the._$ele, 'beforeend');
            the.position();

            return the;
        },


        /**
         * 对话框添加远程地址，并重新定位
         * @param {String} url 远程地址
         * @param {Number} [height=400] 高度
         * @returns {Dialog}
         */
        setRemote: function (url, height) {

            var the = this;
            var options = the._options;
            var $iframe = modification.create('iframe', {
                src: url,
                'class': iframeClass,
                style: {
                    height: height || options.remoteHeight
                }
            });

            the._$ele.innerHTML = '';
            modification.insert($iframe, the._$ele, 'beforeend');
            the.position();

            return the;
        },


        /**
         * 晃动对话框以示提醒
         * @returns {Dialog}
         */
        shake: function () {
            var the = this;

            if (the.shakeTimeid) {
                the.shakeTimeid = 0;
                clearTimeout(the.shakeTimeid);
                attribute.removeClass(the._$dialog, shakeClass);
            }

            attribute.addClass(the._$dialog, shakeClass);

            return the;
        },


        /**
         * 销毁对话框
         * @param {Function} [callback] 打开之后回调
         */
        destroy: function (callback) {
            var the = this;

            // 关闭对话框
            the.close(function () {
                // 从对话框 map 里删除
                delete(dialogsMap[the._id]);


                // 将内容放到 body 里
                modification.insert(the._$ele, body, 'beforeend');

                // 移除事件监听
                event.un(the._$dialog, 'click tap');
                event.un(the._$bg, 'click tap');
                event.un(the._$dialog, animationendEventType);

                // 在 DOM 里删除
                modification.remove(the._$bg);

                if (data.type(callback) === 'function') {
                    callback.call(the);
                }
            });
        },


        /**
         * 获取对话框需要定位的终点位置
         * @returns {Object}
         * @private
         */
        _position: function () {
            var the = this;
            var options = the._options;
            var winW = attribute.width(window);
            var winH = attribute.height(window);
            var pos = {};

            animation.stop(the._$dialog, !0);

            attribute.css(the._$dialog, {
                width: options.width,
                height: options.height
            });

            pos.width = attribute.outerWidth(the._$dialog);
            pos.height = attribute.outerHeight(the._$dialog);

            if (options.left === 'center') {
                pos.left = (winW - pos.width) / 2;
                pos.left = pos.left < 0 ? 0 : pos.left;
            } else {
                pos.left = options.left;
            }

            if (options.top === 'center') {
                pos.top = (winH - pos.height) * 2 / 5;
                pos.top = pos.top < 0 ? 0 : pos.top;
            } else {
                pos.top = options.top;
            }

            return pos;
        }
    }, Emitter);


    modification.importStyle(style);

    event.on(document, 'keyup', function (eve) {
        var d;

        if (eve.which === 27 && openDialogs.length) {
            d = dialogsMap[openDialogs[openDialogs.length - 1]];

            if (d && d.constructor === Dialog) {
                d.shake();
            }
        }
    });

    /**
     * 实例化一个模态交互对话框
     *
     * @param ele {HTMLElement|Node|String} 元素或选择器
     * @param [options] {Object}
     * @param [options.width=500] {Number|String} 对话框宽度
     * @param [options.height="auto"] {Number|String} 对话框高度
     * @param [options.left="center"] {Number|String} 对话框左距离，默认水平居中
     * @param [options.top="center"] {Number|String} 对话框上距离，默认垂直居中（为了美观，表现为2/5处）
     * @param [options.title="无标题对话框"] {String|null} 对话框标题，为null时将隐藏标题栏
     * @param [options.canDrag=true] {Boolean} 对话框是否可以被拖拽，标题栏存在时拖动标题栏，否则拖拽整体
     * @param [options.duration=345] {Number} 对话框打开、关闭的动画时间，单位毫秒
     * @param [options.easing="ease-in-out-back"] {String} 对话框打开、关闭的动画缓冲函数
     * @param [options.remote=null] {null|String} 对话框打开远程地址，优先级2
     * @param [options.remoteHeight=400] {Number} 对话框打开远程地址的高度，单位像素
     * @param [options.content=null] {null|HTMLElement|Node|String} 设置对话框的内容，优先级1
     * @param [options.isWrap=true] {Boolean} 是否自动包裹对话框来，默认 true，优先级1
     * @constructor
     */
    module.exports = Dialog;
});