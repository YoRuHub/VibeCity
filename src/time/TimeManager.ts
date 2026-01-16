/**
 * 簡易イベントエミッター実装
 * 
 * Observer Patternの実装。リスナーの登録・削除・通知機能を提供。
 * TimeManagerとTimeControllerの疎結合を実現するために使用。
 */
class EventEmitter {
    /** イベント名をキーとするリスナー配列のマップ */
    private events: { [key: string]: ((...args: any[]) => void)[] } = {};

    /**
     * イベントリスナーを登録
     * 
     * @param event - イベント名（例: 'timeChanged', 'playStateChanged'）
     * @param listener - イベント発火時に呼ばれるコールバック関数
     */
    public on(event: string, listener: (...args: any[]) => void): void {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
    }

    /**
     * イベントリスナーを削除
     * 
     * @param event - イベント名
     * @param listener - 削除対象のリスナー関数
     */
    public off(event: string, listener: (...args: any[]) => void): void {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(l => l !== listener);
    }

    /**
     * イベントを発火し、登録された全リスナーを実行
     * 
     * @param event - イベント名
     * @param args - リスナーに渡す引数（可変長）
     */
    public emit(event: string, ...args: any[]): void {
        if (!this.events[event]) return;
        this.events[event].forEach(listener => listener(...args));
    }
}

/**
 * 時間帯を表す列挙型
 * 
 * 1日を4つの時間帯に分割し、空の色や太陽・月の位置決定に使用。
 */
export enum TimeOfDay {
    /** 朝（5:00 - 10:00）: 夜明けから午前中 */
    Morning,
    /** 昼（10:00 - 17:00）: 真昼の時間帯 */
    Day,
    /** 夕方（17:00 - 20:00）: 夕焼けから日没 */
    Evening,
    /** 夜（20:00 - 5:00）: 夜間から夜明け前 */
    Night
}

/**
 * 時間管理クラス
 * 
 * ゲーム内時間（0.0〜24.0の数値）を管理し、時間の経過や設定、
 * 時間帯の判定などを提供する。EventEmitterを継承し、時間の変化を
 * 他のコンポーネント（Scene、TimeController等）に通知する。
 * 
 * @fires timeChanged - 時間が変化した時に発火（引数: currentTime）
 * @fires dayChanged - 日付が変わった時（24時を超えた時）に発火
 * @fires timeOfDayChanged - 時間帯が変化した時に発火（引数: TimeOfDay）
 * @fires playStateChanged - 再生/停止状態が変化した時に発火（引数: isPlaying）
 */
export class TimeManager extends EventEmitter {
    /** 現在のゲーム内時間（0.0〜24.0の数値、小数点以下は分を表す） */
    private currentTime: number;
    /** 時間の進行速度倍率（1.0 = 実時間と同速度、デフォルト1.0） */
    private timeScale: number;
    /** 時間が進行中かどうか（true = 進行中、false = 停止） */
    private isPlaying: boolean;

    // === 時間帯の境界定数 ===
    /** 朝の開始時刻（5時） */
    public static readonly MORNING_START = 5;
    /** 昼の開始時刻（10時） */
    public static readonly DAY_START = 10;
    /** 夕方の開始時刻（17時） */
    public static readonly EVENING_START = 17;
    /** 夜の開始時刻（20時） */
    public static readonly NIGHT_START = 20;

    /**
     * TimeManagerのコンストラクタ
     * 
     * @param initialTime - 初期時刻（0.0〜24.0、デフォルト8.0 = 朝8時）
     */
    constructor(initialTime: number = 8.0) {
        super();
        this.currentTime = initialTime;
        this.timeScale = 1.0; // 実時間の1倍速（1秒で1秒進む）
        this.isPlaying = true;
    }

    /**
     * フレームごとの更新ループ
     * 
     * 時間を進行させ、24時を超えた場合は0時にリセットする。
     * 時間変化イベント（timeChanged）と時間帯変化イベントを発火。
     * 
     * 進行速度の計算:
     * - 現実時間の1秒 = ゲーム内1秒
     * - 1時間 = 3600秒なので、1秒あたり 1/3600 時間進む
     * - timeScaleで調整可能（将来的に早送り機能など実装可能）
     * 
     * @param deltaTime - 前フレームからの経過時間（秒単位）
     */
    public update(deltaTime: number): void {
        if (!this.isPlaying) return;

        // ゲーム内時間の進行速度計算
        // 現実時間に合わせて進行 (1秒 = 1秒)
        // 1時間は3600秒なので、1秒あたり 1/3600 時間進む
        const gameHoursPerRealSecond = 1 / 3600;

        this.currentTime += deltaTime * gameHoursPerRealSecond * this.timeScale;

        // 24時間を超えたら0時にリセット（日付変更）
        if (this.currentTime >= 24) {
            this.currentTime -= 24;
            this.emit('dayChanged');
        }

        this.emit('timeChanged', this.currentTime);
        this.checkTimeOfDay();
    }

    /**
     * 現在のゲーム内時間を取得
     * 
     * @returns 現在時刻（0.0〜24.0の数値、小数点以下は分）
     */
    public getTime(): number {
        return this.currentTime;
    }

    /**
     * ゲーム内時間を設定
     * 
     * 時間をクランプ（0〜24の範囲内に制限）し、イベントを発火する。
     * TimeControllerからのスライダー操作などで呼ばれる。
     * 
     * @param time - 設定したい時刻（0.0〜24.0）
     */
    public setTime(time: number): void {
        this.currentTime = Math.max(0, Math.min(24, time));
        this.emit('timeChanged', this.currentTime);
        this.checkTimeOfDay();
    }

    /**
     * 現在の時間から時間帯を判定
     * 
     * @returns TimeOfDay列挙型の値（Morning, Day, Evening, Night）
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

    /** 前回チェック時の時間帯（時間帯変化検出用） */
    private lastTimeOfDay: TimeOfDay | null = null;

    /**
     * 時間帯が変化したかチェックし、変化していればイベント発火
     * 
     * 内部的にupdate()とsetTime()から呼ばれる。
     */
    private checkTimeOfDay(): void {
        const currentToD = this.getTimeOfDay();
        if (this.lastTimeOfDay !== currentToD) {
            this.lastTimeOfDay = currentToD;
            this.emit('timeOfDayChanged', currentToD);
        }
    }

    /**
     * 再生・停止を切り替える
     * 
     * TimeControllerの再生/停止ボタンから呼ばれる。
     */
    public togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
        this.emit('playStateChanged', this.isPlaying);
    }

    /**
     * 再生状態を直接設定
     * 
     * @param playing - true = 再生、false = 停止
     */
    public setPlaying(playing: boolean): void {
        this.isPlaying = playing;
        this.emit('playStateChanged', this.isPlaying);
    }

    /**
     * 時間が進行中かどうかを取得
     * 
     * @returns true = 進行中、false = 停止中
     */
    public isRunning(): boolean {
        return this.isPlaying;
    }
}
