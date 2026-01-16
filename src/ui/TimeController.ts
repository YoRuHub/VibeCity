import { TimeManager } from '../time/TimeManager';

export class TimeController {
    private container: HTMLElement;
    private timeDisplay!: HTMLElement;
    private playPauseButton!: HTMLElement;
    private timeManager: TimeManager;
    private progressBar!: SVGCircleElement;
    private progressThumb!: SVGCircleElement;
    private isDragging: boolean = false;

    // SVG ViewBox座標系
    private readonly VB_SIZE = 200;
    private readonly VB_CENTER = 100;
    private readonly VB_RADIUS = 80;

    private readonly THUMB_RADIUS = 10;

    constructor(timeManager: TimeManager) {
        this.timeManager = timeManager;
        this.container = this.createUI();
        document.body.appendChild(this.container);

        this.timeManager.on('timeChanged', (time: number) => this.updateTimeDisplay(time));
        this.timeManager.on('playStateChanged', (isPlaying: boolean) => this.updatePlayState(isPlaying));

        this.updateTimeDisplay(this.timeManager.getTime());
        this.updatePlayState(this.timeManager.isRunning());
        this.setupDragEvents();
    }

    private createUI(): HTMLElement {
        const container = document.createElement('div');
        container.className = 'time-controller';

        const panel = document.createElement('div');
        panel.className = 'glass-panel';

        // 円形スライダー
        const clockContainer = document.createElement('div');
        clockContainer.className = 'clock-container';

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `0 0 ${this.VB_SIZE} ${this.VB_SIZE}`);
        svg.setAttribute('class', 'time-progress-svg');

        // 背景円
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', String(this.VB_CENTER));
        bgCircle.setAttribute('cy', String(this.VB_CENTER));
        bgCircle.setAttribute('r', String(this.VB_RADIUS));
        bgCircle.setAttribute('class', 'progress-bg');
        svg.appendChild(bgCircle);

        // 進行バー
        this.progressBar = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.progressBar.setAttribute('cx', String(this.VB_CENTER));
        this.progressBar.setAttribute('cy', String(this.VB_CENTER));
        this.progressBar.setAttribute('r', String(this.VB_RADIUS));
        this.progressBar.setAttribute('class', 'progress-bar');
        this.progressBar.setAttribute('transform', `rotate(-90 ${this.VB_CENTER} ${this.VB_CENTER})`);

        const circumference = this.VB_RADIUS * 2 * Math.PI;
        this.progressBar.style.strokeDasharray = `${circumference} ${circumference}`;
        svg.appendChild(this.progressBar);

        // つまみ
        this.progressThumb = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.progressThumb.setAttribute('r', String(this.THUMB_RADIUS));
        this.progressThumb.setAttribute('class', 'progress-thumb');
        svg.appendChild(this.progressThumb);

        clockContainer.appendChild(svg);

        // 中央情報
        const centerInfo = document.createElement('div');
        centerInfo.className = 'center-info';

        this.timeDisplay = document.createElement('div');
        this.timeDisplay.className = 'time-display';
        centerInfo.appendChild(this.timeDisplay);

        this.playPauseButton = document.createElement('button');
        this.playPauseButton.className = 'play-pause-btn';
        this.playPauseButton.onclick = (e) => {
            e.stopPropagation();
            this.timeManager.togglePlayPause();
        };
        centerInfo.appendChild(this.playPauseButton);

        clockContainer.appendChild(centerInfo);
        panel.appendChild(clockContainer);

        // ジャンプボタン
        const jumpControls = document.createElement('div');
        jumpControls.className = 'jump-controls';

        const jumps = [
            { label: 'Morning', action: () => this.timeManager.setTime(6), iconClass: 'icon-morning' },
            { label: 'Day', action: () => this.timeManager.setTime(12), iconClass: 'icon-day' },
            { label: 'Night', action: () => this.timeManager.setTime(20), iconClass: 'icon-night' },
            {
                label: 'Now',
                action: () => {
                    const now = new Date();
                    const currentHours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
                    this.timeManager.setTime(currentHours);
                },
                iconClass: 'icon-now'
            }
        ];

        jumps.forEach(jump => {
            const btn = document.createElement('button');
            btn.className = `jump-btn ${jump.label.toLowerCase()}`;
            btn.title = jump.label;
            btn.onclick = jump.action;

            const icon = document.createElement('div');
            icon.className = `icon ${jump.iconClass}`;
            btn.appendChild(icon);

            jumpControls.appendChild(btn);
        });

        panel.appendChild(jumpControls);
        container.appendChild(panel);

        return container;
    }

    private setupDragEvents(): void {
        const svg = this.container.querySelector('.time-progress-svg') as SVGSVGElement;
        if (!svg) return;

        const handleStart = (e: MouseEvent | TouchEvent) => {
            // 再生ボタンやジャンプボタンのクリックを除外
            const target = e.target as HTMLElement;
            if (target.closest('.play-pause-btn') || target.closest('.jump-btn')) {
                return;
            }

            this.isDragging = true;
            this.progressBar.style.transition = 'none';
            this.progressThumb.style.transition = 'none';
            // handleDrag(e)を削除 - クリックしただけでは時間を変更しない
        };

        const handleMove = (e: MouseEvent | TouchEvent) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.handleDrag(e);
        };

        const handleEnd = () => {
            if (!this.isDragging) return;
            this.isDragging = false;
            this.progressBar.style.transition = '';
            this.progressThumb.style.transition = '';
        };

        svg.addEventListener('mousedown', handleStart);
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleEnd);

        svg.addEventListener('touchstart', handleStart, { passive: false });
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleEnd);
    }

    private handleDrag(e: MouseEvent | TouchEvent): void {
        const svg = this.container.querySelector('.time-progress-svg') as SVGSVGElement;
        if (!svg) return;

        const rect = svg.getBoundingClientRect();

        let clientX: number, clientY: number;
        if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        } else if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0]!.clientX;
            clientY = e.touches[0]!.clientY;
        } else {
            return;
        }

        // 中心からの相対座標（スクリーン座標系）
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = clientX - centerX;
        const dy = clientY - centerY;

        // 角度計算（12時方向を0度とする）
        // Math.atan2(dy, dx)は右方向が0度、下方向がPI/2
        // + PI/2すると上方向（12時）が0度になる
        let angle = Math.atan2(dy, dx) + Math.PI / 2;

        // 0～2PIに正規化
        if (angle < 0) angle += Math.PI * 2;

        // 時間に変換（0～24時間）
        const time = (angle / (Math.PI * 2)) * 24;
        this.timeManager.setTime(time);
    }

    private updateTimeDisplay(time: number): void {
        const hours = Math.floor(time);
        const minutes = Math.floor((time - hours) * 60);
        this.timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        // プログレスバー更新
        const circumference = this.VB_RADIUS * 2 * Math.PI;
        const progress = time / 24;
        const offset = circumference * (1 - progress);
        this.progressBar.style.strokeDashoffset = String(offset);

        // つまみの位置更新（ViewBox座標系）
        // 12時方向を0度とするため、-PI/2から開始
        const angle = (time / 24) * Math.PI * 2 - Math.PI / 2;
        const thumbX = this.VB_CENTER + Math.cos(angle) * this.VB_RADIUS;
        const thumbY = this.VB_CENTER + Math.sin(angle) * this.VB_RADIUS;

        this.progressThumb.setAttribute('cx', String(thumbX));
        this.progressThumb.setAttribute('cy', String(thumbY));
    }

    private updatePlayState(isPlaying: boolean): void {
        this.playPauseButton.classList.toggle('playing', isPlaying);
    }
}
