/*!
 * drag.js
 * @author ydr.me
 * @create 2014-10-08 16:43
 */


define(function (require, exports, module) {
    /**
     * 扩展拖拽事件支持
     *
     * @module core/event/drag
     * @requires util/data
     * @requires core/event/touch
     * @requires core/dom/attribute
     * @requires core/dom/modification
     * @requires core/dom/animation
     * @requires core/dom/selector
     *
     * @example
     * // dom结构
     * // &lt;div id="abc"&gt;
     * //     这里的 draggablefor 属性指向的是拖拽影响的元素
     * //     &lt;div draggablefor="abc"&gt;&lt;/div&gt;
     * // &lt;/div&gt;
     * event.on(ele, 'dragstart', fn);
     * event.on(ele, 'drag', fn);
     * event.on(ele, 'dragend', fn);
     */
    'use strict';

    var data = require('../../util/data.js');
    var event = require('./touch.js');
    var attribute = require('../dom/attribute.js');
    var modification = require('../dom/modification.js');
    var animation = require('../dom/animation.js');
    var selector = require('../dom/selector.js');
    var dragstart = 'mousedown taphold';
    var drag = 'mousemove touchmove MSPointerMove pointermove';
    var dragend = 'mouseup touchend MSPointerUp pointerup touchcancel MSPointerCancel pointercancel';
    var x0 = null;
    var y0 = null;
    // 0 = 未开始拖动
    // 1 = 开始拖动
    // 2 = 拖动中
    var state = 0;
    // 触发元素
    var ele;
    // 克隆拖拽元素
    var clone;
    // 拖拽影响元素
    var dragfor;
    var left;
    var top;
    var style =
        '.alien-ui-drag-clone{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;opacity:.5;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;position:absolute;z-index:999;background:#eee;border:1px dotted #000}';

    modification.importStyle(style);

    event.on(document, dragstart, function (eve) {
        var _eve = eve.type === 'mousedown' && eve.which === 1 ? eve : (
                eve.touches && eve.touches.length ? eve.touches[0] : null
            );
        var _dragfor;

        ele = _getDragable(eve.target);

        if (ele) {
            _dragfor = selector.query('#' + attribute.attr(ele, 'draggablefor'));
            x0 = _eve ? _eve.clientX : null;
            y0 = _eve ? _eve.clientY : null;

            if (x0 !== null && y0 !== null && state === 0 &&
                ele !== document.body && _dragfor.length && _dragfor[0].contains(ele)) {
                state = 1;
                dragfor = _dragfor[0];
                left = attribute.left(ele);
                top = attribute.top(ele);
            }
        }
    });

    event.on(document, drag, function (eve) {
        var _eve = eve.type === 'mousemove' && eve.which === 1 ? eve : (
                eve.touches && eve.touches.length ? eve.touches[0] : null
            );
        var x1 = _eve ? _eve.clientX : null;
        var y1 = _eve ? _eve.clientY : null;

        // 发生了变化
        if (state === 1 && x0 !== null && y0 !== null && x1 !== null && y1 !== null && (x0 !== x1 || y0 !== y1)) {
            state = 2;
            event.dispatch(eve.target, 'dragstart', _eve);
            clone = modification.create('div', {
                style: {
                    position: 'absolute',
                    width: attribute.width(dragfor) - 2,
                    height: attribute.height(dragfor) - 2,
                    left: attribute.left(dragfor),
                    top: attribute.top(dragfor),
                    zIndex: 99999999999999
                },
                'class': 'alien-ui-drag-clone',
                draggable: 'true'
            }, {
                draggable: true
            });
            modification.insert(clone, document.body, 'beforeend');
        }

        if (state === 2) {
            attribute.left(clone, left + x1 - x0);
            attribute.top(clone, top + y1 - y0);
            event.dispatch(ele, 'drag', _eve);
            eve.preventDefault();
        }
    });

    event.on(document, dragend, function (eve) {
        var _eve = eve.type === 'mousemove' && eve.which === 1 ?
            eve :
            (eve.touches && eve.touches.length ?
                eve.touches[0] :
                (eve.changedTouches && eve.changedTouches.length ? eve.changedTouches[0] : null)
                );
        // 先记录初始值，最后还原，再动画
        var from = {
            left: attribute.css(dragfor, 'left'),
            top: attribute.css(dragfor, 'top'),
            marginLeft: attribute.css(dragfor, 'margin-left'),
            marginTop: attribute.css(dragfor, 'margin-top')
        };
        var to;

        if (state === 2) {
            attribute.left(dragfor, attribute.left(clone));
            attribute.top(dragfor, attribute.top(clone));
            to = {
                left: attribute.css(dragfor, 'left'),
                top: attribute.css(dragfor, 'top'),
                marginLeft: attribute.css(dragfor, 'margin-left'),
                marginTop: attribute.css(dragfor, 'margin-top')
            };
            attribute.css(dragfor, from);
            animation.stop(dragfor);
            animation.animate(dragfor, to, {
                duration: 300
            });

            modification.remove(clone);
            clone = null;
            event.dispatch(ele, 'dragend', _eve);
        }

        state = 0;
        x0 = null;
        y0 = null;
    });


    module.exports = event;


    /**
     * 获取当前作用元素最近的可拖拽元素
     * @param ele
     * @returns {*}
     * @private
     */
    function _getDragable(ele) {
        while (ele) {
            if (attribute.attr(ele, 'draggablefor')) {
                return ele;
            }

            ele = selector.parent(ele)[0];
        }

        return null;
    }
});