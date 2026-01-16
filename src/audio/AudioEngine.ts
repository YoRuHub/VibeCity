import * as Tone from 'tone';

/**
 * オーディオエンジンクラス
 * Tone.jsを使用したインタラクティブなサウンド生成
 */
export class AudioEngine {
    private synth: Tone.PolySynth | null = null;
    private isInitialized = false;

    /**
     * オーディオコンテキストの初期化
     * ユーザーインタラクション後に呼び出す必要がある
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            await Tone.start();

            // ポリフォニックシンセサイザーの作成
            this.synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'sine' },
                envelope: {
                    attack: 0.01,
                    decay: 0.2,
                    sustain: 0.3,
                    release: 0.5,
                },
            }).toDestination();

            this.synth.volume.value = -10; // 音量調整

            this.isInitialized = true;
            console.log('AudioEngine initialized');
        } catch (error) {
            console.error('Failed to initialize AudioEngine:', error);
        }
    }

    /**
     * 音を鳴らす
     * @param frequency 周波数（Hz）
     * @param duration 持続時間（秒）
     */
    playNote(frequency: number, duration: number = 0.3): void {
        if (!this.isInitialized || !this.synth) {
            console.warn('AudioEngine not initialized');
            return;
        }

        try {
            this.synth.triggerAttackRelease(frequency, duration);
        } catch (error) {
            console.error('Failed to play note:', error);
        }
    }

    /**
     * 座標から周波数を計算
     * ヘキサゴンの位置に応じた音階を生成
     */
    coordsToFrequency(q: number, r: number): number {
        // ペンタトニックスケール（C major pentatonic）
        const notes = [
            261.63, // C4
            293.66, // D4
            329.63, // E4
            392.0,  // G4
            440.0,  // A4
            523.25, // C5
        ];

        const index = Math.abs((q + r) % notes.length);
        return notes[index] ?? 440;
    }

    /**
     * クリーンアップ
     */
    dispose(): void {
        if (this.synth) {
            this.synth.dispose();
            this.synth = null;
        }
        this.isInitialized = false;
    }
}
