import './style.css';
import { Scene } from './core/Scene';
import { HexGrid } from './hex/HexGrid';
import { AudioEngine } from './audio/AudioEngine';
import { RippleSystem } from './effects/RippleSystem';
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
    private rippleSystem: RippleSystem;
    private timeManager: TimeManager;
    private timeController: TimeController;
    private raycaster: any; // THREE.Raycaster
    private mouse: any; // THREE.Vector2

    constructor() {
        const app = document.querySelector<HTMLDivElement>('#app');
        if (!app) throw new Error('App container not found');

        // 各モジュールの初期化
        this.scene = new Scene(app);
        this.hexGrid = new HexGrid(30);
        this.audioEngine = new AudioEngine();
        this.rippleSystem = new RippleSystem();

        // 時間管理システムの初期化
        this.timeManager = new TimeManager(22); // 初期設定は夜(22時)
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
        window.addEventListener('click', this.handleClick.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }

    /**
     * クリックイベントハンドラ
     */
    private async handleClick(event: MouseEvent): Promise<void> {
        // 初回クリックでオーディオエンジンを初期化
        await this.audioEngine.initialize();

        // レイキャストで六角形の検出
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);

        const intersects = this.raycaster.intersectObjects(
            this.hexGrid.getAllHexes()
        );

        if (intersects.length > 0) {
            const hex = intersects[0]?.object as any; // THREE.Mesh
            if (!hex) return;

            const { q, r } = hex.userData as { q: number; r: number };

            // 音を鳴らす
            const frequency = this.audioEngine.coordsToFrequency(q, r);
            this.audioEngine.playNote(frequency);

            // 波紋エフェクトを生成（より洗練されたパラメータ）
            this.rippleSystem.createRipple(q, r, 8, 10.0);
        }
    }

    /**
     * マウス移動イベントハンドラ
     */
    private handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event);
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

        // 波紋システムの更新
        this.rippleSystem.update(deltaTime);

        // 各六角形の明るさを更新
        const hexStates = this.hexGrid.getAllHexStates();
        for (const hexState of hexStates) {
            const intensity = this.rippleSystem.getIntensityAt(hexState.q, hexState.r);
            this.hexGrid.updateHexIntensity(hexState.q, hexState.r, intensity);
        }

        // HexGridのスムーズな遷移を更新
        this.hexGrid.update(deltaTime);
    }
}

// アプリケーションの起動
new App();
