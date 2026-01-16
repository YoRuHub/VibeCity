// EventEmitterを内部定義してインポートエラーを回避
class EventEmitter {
    private events: { [key: string]: ((...args: any[]) => void)[] } = {};

    public on(event: string, listener: (...args: any[]) => void): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    public off(event: string, listener: (...args: any[]) => void): void {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    public emit(event: string, ...args: any[]): void {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }
}

/**
 * 時間帯を表す列挙型
 */
export enum TimeOfDay {
    Morning, // 05:00 - 10:00
    Day,     // 10:00 - 17:00
    Evening, // 17:00 - 20:00
    Night    // 20:00 - 05:00
}

/**
 * 時間管理クラス
 * 0.0〜24.0 の数値で時間を管理する
 */
export class TimeManager extends EventEmitter {
    private currentTime: number;
    private timeScale: number;
    private isPlaying: boolean;

    // 定数
    public static readonly MORNING_START = 5;
    public static readonly DAY_START = 10;
    public static readonly EVENING_START = 17;
    public static readonly NIGHT_START = 20;

    constructor(initialTime: number = 8.0) { // デフォルトは朝8時
        super();
        this.currentTime = initialTime;
        this.timeScale = 1.0; // 実時間の1倍（1秒で1秒進む）... ゲーム的には遅すぎるので調整が必要かも
        this.isPlaying = true;
    }

    /**
     * 更新ループ
     * @param deltaTime 経過時間（秒）
     */
    public update(deltaTime: number): void {
        if (!this.isPlaying) return;

        // ゲーム内時間の進行速度調整
        // 現実時間に合わせて進行 (1秒 = 1秒)
        // 1時間は3600秒なので、1秒あたり 1/3600 時間進む
        const gameHoursPerRealSecond = 1 / 3600;

        this.currentTime += deltaTime * gameHoursPerRealSecond * this.timeScale;

        // 24時間を超えたらリセット
        if (this.currentTime >= 24) {
            this.currentTime -= 24;
            this.emit('dayChanged');
        }

        this.emit('timeChanged', this.currentTime);
        this.checkTimeOfDay();
    }

    /**
     * 現在の時間を取得
     */
    public getTime(): number {
        return this.currentTime;
    }

    /**
     * 時間を設定
     */
    public setTime(time: number): void {
        this.currentTime = Math.max(0, Math.min(24, time));
        this.emit('timeChanged', this.currentTime);
        this.checkTimeOfDay();
    }

    /**
     * 時間帯を取得
     */
    public getTimeOfDay(): TimeOfDay {
        if (this.currentTime >= TimeManager.MORNING_START && this.currentTime < TimeManager.DAY_START) {
            return TimeOfDay.Morning;
        } else if (this.currentTime >= TimeManager.DAY_START && this.currentTime < TimeManager.EVENING_START) {
            return TimeOfDay.Day;
        } else if (this.currentTime >= TimeManager.EVENING_START && this.currentTime < TimeManager.NIGHT_START) {
            return TimeOfDay.Evening;
        } else {
            return TimeOfDay.Night;
        }
    }

    /**
     * 時間帯が変化したかチェックしてイベント発火
     */
    private lastTimeOfDay: TimeOfDay | null = null;
    private checkTimeOfDay(): void {
        const currentToD = this.getTimeOfDay();
        if (this.lastTimeOfDay !== currentToD) {
            this.lastTimeOfDay = currentToD;
            this.emit('timeOfDayChanged', currentToD);
        }
    }

    /**
     * 再生・停止の切り替え
     */
    public togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
        this.emit('playStateChanged', this.isPlaying);
    }

    public setPlaying(playing: boolean): void {
        this.isPlaying = playing;
        this.emit('playStateChanged', this.isPlaying);
    }

    public isRunning(): boolean {
        return this.isPlaying;
    }
}
