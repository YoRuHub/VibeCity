import './style.css';
import { Scene } from './core/Scene';
import { HexGrid } from './hex/HexGrid';
import { AudioEngine } from './audio/AudioEngine';
import * as THREE from 'three';

/**
 * アプリケーションのメインクラス
 */
class App {
    private scene: Scene;
    private hexGrid: HexGrid;
    private audioEngine: AudioEngine;
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;

    constructor() {
        const app = document.querySelector<HTMLDivElement>('#app');
        if (!app) throw new Error('App container not found');

        // 各モジュールの初期化
        this.scene = new Scene(app);
        this.hexGrid = new HexGrid(8);
        this.audioEngine = new AudioEngine();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // ヘキサゴングリッドをシーンに追加
        this.scene.scene.add(this.hexGrid.getGroup());

        // イベントリスナーの登録
        this.setupEventListeners();

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
        if (!this.audioEngine) {
            await this.audioEngine.initialize();
        }

        // レイキャストで六角形の検出
        this.updateMousePosition(event);
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);

        const intersects = this.raycaster.intersectObjects(
            this.hexGrid.getAllHexes()
        );

        if (intersects.length > 0) {
            const hex = intersects[0]?.object as THREE.Mesh;
            if (!hex) return;

            const { q, r } = hex.userData as { q: number; r: number };

            // 音を鳴らす
            const frequency = this.audioEngine.coordsToFrequency(q, r);
            this.audioEngine.playNote(frequency);

            // ビジュアルエフェクト
            this.animateHex(hex);
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
     * 六角形のアニメーション
     */
    private animateHex(hex: THREE.Mesh): void {
        // 簡易的なスケールアニメーション
        const originalScale = hex.scale.clone();
        hex.scale.set(1.2, 1.2, 1.2);

        setTimeout(() => {
            hex.scale.copy(originalScale);
        }, 150);

        // 色の変更
        const material = hex.material as THREE.MeshStandardMaterial;
        const originalColor = material.color.clone();
        material.color.setHex(0xffffff);

        setTimeout(() => {
            material.color.copy(originalColor);
        }, 150);
    }

    /**
     * フレームごとの更新処理
     */
    private update(_deltaTime: number): void {
        // 将来的にアニメーションやシミュレーションを追加
    }
}

// アプリケーションの起動
new App();
