import { HexUtils } from '../hex/HexGrid';

/**
 * 個別の波紋を表すクラス
 */
class Ripple {
    public currentRadius: number = 0;
    public intensity: number = 1.0;

    constructor(
        public q: number,
        public r: number,
        public maxRadius: number,
        public speed: number
    ) { }

    /**
     * 波紋を更新
     * @returns 波紋が終了した場合はtrue
     */
    update(deltaTime: number): boolean {
        this.currentRadius += this.speed * deltaTime;

        // 強度の減衰（非線形カーブでより繊細に）
        const progress = this.currentRadius / this.maxRadius;
        this.intensity = Math.max(0, Math.pow(1 - progress, 1.5));

        // 最大半径に到達したら終了
        return this.currentRadius >= this.maxRadius;
    }

    /**
     * 指定座標での波紋の強度を取得
     */
    getIntensityAt(q: number, r: number): number {
        const distance = HexUtils.axialDistance(this.q, this.r, q, r);

        // 中心部の発光（2倍に調整）
        if (distance < 0.5) {
            return this.intensity * 2.5;
        }

        // 波紋の幅（シャープに）
        const rippleWidth = 2.5;

        // 現在の半径からの距離
        const distanceFromWave = Math.abs(distance - this.currentRadius);

        // 波紋の幅内にある場合、強度を計算（スムースカーブ）
        if (distanceFromWave < rippleWidth) {
            const normalizedDist = distanceFromWave / rippleWidth;
            const localIntensity = Math.pow(1 - normalizedDist, 2.0);
            return localIntensity * this.intensity;
        }

        return 0;
    }
}

/**
 * 波紋システム管理クラス
 */
export class RippleSystem {
    private ripples: Ripple[] = [];

    /**
     * 新しい波紋を生成
     */
    createRipple(q: number, r: number, maxRadius: number = 15, speed: number = 5.0): void {
        const ripple = new Ripple(q, r, maxRadius, speed);
        this.ripples.push(ripple);
    }

    /**
     * 全波紋を更新
     */
    update(deltaTime: number): void {
        // 各波紋を更新
        for (let i = this.ripples.length - 1; i >= 0; i--) {
            const ripple = this.ripples[i];
            if (!ripple) continue;

            const finished = ripple.update(deltaTime);

            // 終了した波紋を削除
            if (finished) {
                this.ripples.splice(i, 1);
            }
        }
    }

    /**
     * 指定座標での波紋強度を計算（全波紋の重ね合わせ）
     */
    getIntensityAt(q: number, r: number): number {
        let totalIntensity = 0;

        for (const ripple of this.ripples) {
            totalIntensity += ripple.getIntensityAt(q, r);
        }

        // 最大1.0に制限
        return Math.min(1.0, totalIntensity);
    }

    /**
     * アクティブな波紋の数を取得
     */
    getActiveRippleCount(): number {
        return this.ripples.length;
    }

    /**
     * すべての波紋をクリア
     */
    clear(): void {
        this.ripples = [];
    }
}
