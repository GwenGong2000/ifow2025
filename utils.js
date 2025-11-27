// 工具函数库

class GameUtils {
    // 坐标转换工具
    static pixelToGrid(pixelX, pixelY, cellSize, offsetX, offsetY) {
        const gridX = Math.round((pixelX - offsetX) / cellSize);
        const gridY = Math.round((pixelY - offsetY) / cellSize);
        return { x: gridX, y: gridY };
    }

    static gridToPixel(gridX, gridY, cellSize, offsetX, offsetY) {
        const pixelX = gridX * cellSize + offsetX;
        const pixelY = gridY * cellSize + offsetY;
        return { x: pixelX, y: pixelY };
    }

    // 检查坐标是否在棋盘范围内
    static isValidPosition(x, y, boardWidth, boardHeight) {
        return x >= 0 && x < boardWidth && y >= 0 && y < boardHeight;
    }

    // 深拷贝对象
    static deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    clonedObj[key] = this.deepClone(obj[key]);
                }
            }
            return clonedObj;
        }
    }

    // 格式化时间
    static formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // 保存数据到localStorage
    static saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('保存到localStorage失败:', e);
            return false;
        }
    }

    // 从localStorage加载数据
    static loadFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('从localStorage加载失败:', e);
            return null;
        }
    }

    // 生成唯一ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 延迟执行
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 防抖函数
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 节流函数
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// 音效管理类
class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.sounds = {};
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (e) {
            console.warn('音频上下文初始化失败:', e);
        }
    }

    createSounds() {
        // 创建落子音效
        this.sounds.place = () => this.playTone(800, 0.1);
        // 创建胜利音效
        this.sounds.win = () => this.playVictorySound();
        // 创建按键音效
        this.sounds.click = () => this.playTone(600, 0.05);
        // 创建错误音效
        this.sounds.error = () => this.playTone(300, 0.2);
    }

    playTone(frequency, duration) {
        if (!this.enabled || !this.audioContext) return;

        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (e) {
            console.warn('播放音效失败:', e);
        }
    }

    playVictorySound() {
        if (!this.enabled || !this.audioContext) return;

        try {
            const notes = [523, 659, 784, 1047]; // C, E, G, C
            notes.forEach((freq, index) => {
                setTimeout(() => this.playTone(freq, 0.3), index * 100);
            });
        } catch (e) {
            console.warn('播放胜利音效失败:', e);
        }
    }

    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }
}

// 动画管理类
class AnimationManager {
    constructor() {
        this.animations = [];
        this.isRunning = false;
    }

    addAnimation(element, properties, duration, easing = 'ease-out') {
        const animation = {
            element,
            properties,
            duration,
            easing,
            startTime: performance.now(),
            startValues: {},
            targetValues: {}
        };

        // 获取初始值
        for (const prop in properties) {
            animation.startValues[prop] = parseFloat(getComputedStyle(element)[prop]) || 0;
            animation.targetValues[prop] = properties[prop];
        }

        this.animations.push(animation);

        if (!this.isRunning) {
            this.start();
        }

        return animation;
    }

    start() {
        this.isRunning = true;
        this.animate();
    }

    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        let hasActiveAnimations = false;

        this.animations = this.animations.filter(animation => {
            const elapsed = currentTime - animation.startTime;
            const progress = Math.min(elapsed / animation.duration, 1);

            const easedProgress = this.ease(progress, animation.easing);

            for (const prop in animation.properties) {
                const startValue = animation.startValues[prop];
                const targetValue = animation.targetValues[prop];
                const currentValue = startValue + (targetValue - startValue) * easedProgress;
                animation.element.style[prop] = currentValue + 'px';
            }

            if (progress < 1) {
                hasActiveAnimations = true;
                return true;
            } else {
                return false;
            }
        });

        if (hasActiveAnimations) {
            requestAnimationFrame(() => this.animate());
        } else {
            this.isRunning = false;
        }
    }

    ease(t, easing) {
        switch (easing) {
            case 'ease-out':
                return 1 - Math.pow(1 - t, 3);
            case 'ease-in':
                return Math.pow(t, 3);
            case 'ease-in-out':
                return t < 0.5 ? 4 * Math.pow(t, 3) : 1 - Math.pow(-2 * t + 2, 3) / 2;
            default:
                return t;
        }
    }

    stop() {
        this.isRunning = false;
        this.animations = [];
    }
}

// 通知管理类
class NotificationManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'notification-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transform: translateX(100%);
            transition: transform 0.3s ease;
            pointer-events: auto;
            max-width: 300px;
            word-wrap: break-word;
        `;
        notification.textContent = message;

        this.container.appendChild(notification);

        // 触发动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);

        // 自动移除
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    getBackgroundColor(type) {
        switch (type) {
            case 'success':
                return '#00b894';
            case 'error':
                return '#d63031';
            case 'warning':
                return '#fdcb6e';
            case 'info':
            default:
                return '#74b9ff';
        }
    }
}

// 全局工具实例
window.gameUtils = GameUtils;
window.soundManager = new SoundManager();
window.animationManager = new AnimationManager();
window.notificationManager = new NotificationManager();