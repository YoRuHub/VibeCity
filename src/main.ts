import './style.css';
import { Scene } from './core/Scene';
import { HexGrid, HexUtils } from './hex/HexGrid';
import { AudioEngine } from './audio/AudioEngine';
import { TimeManager } from './time/TimeManager';
import { TimeController } from './ui/TimeController';

// @ts-ignore
import * as THREE from 'three';

/**
 * アプリケーションのメインクラス
 */
class App {
    private scene: Scene;
    private hexGrid: HexGrid;
    private audioEngine: AudioEngine;
    private timeManager: TimeManager;
    // @ts-ignore
    private timeController: TimeController; // UI表示のために必要（インスタンス化時にDOM追加）

    private raycaster: any; // THREE.Raycaster
    private mouse: any; // THREE.Vector2
    private isMouseDown: boolean = false;
    private lastTriggeredHex: string | null = null;

    constructor() {
        const app = document.querySelector<HTMLDivElement>('#app');
        if (!app) throw new Error('App container not found');

        // 各モジュールの初期化
        this.scene = new Scene(app);
        this.hexGrid = new HexGrid(30);
        this.audioEngine = new AudioEngine();

        // 時間管理システムの初期化
        this.timeManager = new TimeManager(22); // 初期設定は夜(22時)

        // 時間操作UIの初期化
        this.timeController = new TimeController(this.timeManager);

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // ヘキサゴングリッドをシーンに追加
        this.scene.scene.add(this.hexGrid.getGroup());

        // イベントリスナーの登録
        this.setupEventListeners();

        // 時間変更イベントの初期バインド
        this.timeManager.on('timeChanged', (time: number) => {
            this.scene.setTime(time);
        });

        // アニメーションループの開始
        this.scene.startAnimation(this.update.bind(this));

        console.log('VibeCity initialized');
    }

    /**
     * イベントリスナーのセットアップ
     */
    private setupEventListeners(): void {
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // タッチデバイス対応も考慮（簡易的）
        window.addEventListener('touchstart', (e) => this.handleMouseDown(e.touches[0] as unknown as MouseEvent));
        window.addEventListener('touchend', this.handleMouseUp.bind(this));
        window.addEventListener('touchmove', (e) => this.handleMouseMove(e.touches[0] as unknown as MouseEvent));
    }

    /**
     * インタラクション実行（音と波紋）
     */
    private triggerInteraction(q: number, r: number): void {
        const key = `${q},${r}`;

        // 連続トリガー防止（同じHexならスキップ、ただしドラッグ中は少し許容してもいいかもしれないが、今回は厳密にHex単位で）
        if (this.lastTriggeredHex === key) return;

        // 音を鳴らす
        const frequency = this.audioEngine.coordsToFrequency(q, r);
        this.audioEngine.playNote(frequency);

        // 波紋エフェクトを生成
        this.hexGrid.triggerWave(q, r);

        this.lastTriggeredHex = key;
    }

    /**
     * マウスダウンイベントハンドラ
     */
    private async handleMouseDown(event: MouseEvent): Promise<void> {
        this.isMouseDown = true;
        this.lastTriggeredHex = null; // リセット

        // 初回クリックでオーディオエンジンを初期化
        await this.audioEngine.initialize();

        this.handleInput();
    }

    /**
     * マウスアップイベントハンドラ
     */
    private handleMouseUp(): void {
        this.isMouseDown = false;
        this.lastTriggeredHex = null;
    }

    /**
     * マウス移動イベントハンドラ
     */
    private handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event);

        // ホバー処理 + ドラッグ時の連続発火
        this.handleInput(true);
    }

    /**
     * 入力処理共通ロジック
     * @param isMove 移動イベントかどうか
     */
    private handleInput(isMove: boolean = false): void {
        // レイキャスト（Y=0平面との交差判定）
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(plane, target)) {
            // 座標変換
            const { q, r } = HexUtils.worldToAxial(target.x, target.z);

            // 範囲内かチェック
            if (HexUtils.axialDistance(0, 0, q, r) <= 30) {
                // ホバー更新 (移動時のみ)
                if (isMove) {
                    this.hexGrid.setHover(q, r);
                }

                // トリガー判定: マウスダウン中 または クリック時（MouseDownイベント経由）
                if (this.isMouseDown) {
                    this.triggerInteraction(q, r);
                }
            } else {
                if (isMove) {
                    // @ts-ignore
                    this.hexGrid.setHover(null, null);
                }
            }
        } else {
            if (isMove) {
                // @ts-ignore
                this.hexGrid.setHover(null, null);
            }
        }
    }

    /**
     * マウス位置の更新
     */
    private updateMousePosition(event: MouseEvent): void {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    /**
     * フレームごとの更新処理
     */
    private update(deltaTime: number): void {
        // 時間進行の更新
        this.timeManager.update(deltaTime);

        // HexGridの更新（波紋、色アニメーション含む）
        this.hexGrid.update(deltaTime);
    }
}

// アプリケーションの起動
new App();
