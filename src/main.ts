import './style.css';
import { Scene } from './core/Scene';
import { HexGrid, HexUtils } from './hex/HexGrid';
import { AudioEngine } from './audio/AudioEngine';
import { TimeManager } from './time/TimeManager';
import { TimeController } from './ui/TimeController';
import { TilePalette } from './ui/TilePalette';

// @ts-ignore
import * as THREE from 'three';

/** メインアプリケーションクラス */
class App {
    private scene: Scene;
    private hexGrid: HexGrid;
    private audioEngine: AudioEngine;
    private timeManager: TimeManager;
    // @ts-ignore
    private timeController: TimeController; // UI表示のために必要（インスタンス化時にDOM追加）
    private tilePalette: TilePalette;        // タイル選択UI

    private raycaster: any; // THREE.Raycaster
    private mouse: any; // THREE.Vector2
    private isMouseDown: boolean = false;
    private lastTriggeredHex: string | null = null;

    private interactionMode: 'tile' | 'wave' = 'tile'; // タイル配置モード

    constructor() {
        const app = document.querySelector<HTMLDivElement>('#app');
        if (!app) throw new Error('App container not found');

        // モジュール初期化
        this.scene = new Scene(app);
        this.hexGrid = new HexGrid(30);
        this.audioEngine = new AudioEngine();

        this.timeManager = new TimeManager(22); // 初期時刻: 22時
        this.timeController = new TimeController(this.timeManager);
        this.tilePalette = new TilePalette();

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.scene.scene.add(this.hexGrid.getGroup());

        this.setupEventListeners();

        this.timeManager.on('timeChanged', (time: number) => {
            this.scene.setTime(time);
        });

        this.scene.startAnimation(this.update.bind(this));

        console.log('VibeCity initialized');
    }

    /** イベントリスナー登録 */
    private setupEventListeners(): void {
        window.addEventListener('mousedown', this.handleMouseDown.bind(this));
        window.addEventListener('mouseup', this.handleMouseUp.bind(this));
        window.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // タッチデバイス対応
        window.addEventListener('touchstart', (e) => this.handleMouseDown(e.touches[0] as unknown as MouseEvent));
        window.addEventListener('touchend', this.handleMouseUp.bind(this));
        window.addEventListener('touchmove', (e) => this.handleMouseMove(e.touches[0] as unknown as MouseEvent));
    }

    /** 音と波紋のインタラクション */
    private triggerInteraction(q: number, r: number): void {
        const key = `${q},${r}`;

        if (this.lastTriggeredHex === key) return; // 連続トリガー防止

        const frequency = this.audioEngine.coordsToFrequency(q, r);
        this.audioEngine.playNote(frequency);
        this.hexGrid.triggerWave(q, r);
        this.lastTriggeredHex = key;
    }

    /** マウスダウン処理 */
    private async handleMouseDown(_event: MouseEvent): Promise<void> {
        this.isMouseDown = true;
        this.lastTriggeredHex = null;


        await this.audioEngine.initialize();

        this.handleInput();
    }

    /** マウスアップ処理 */
    private handleMouseUp(): void {
        this.isMouseDown = false;
        this.lastTriggeredHex = null;
    }

    /** マウス移動処理 */
    private handleMouseMove(event: MouseEvent): void {
        this.updateMousePosition(event);


        this.handleInput(true);
    }

    /** 入力処理（クリック/ドラッグ） */
    private handleInput(isMove: boolean = false): void {

        this.raycaster.setFromCamera(this.mouse, this.scene.camera);
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const target = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(plane, target)) {

            const { q, r } = HexUtils.worldToAxial(target.x, target.z);

            if (HexUtils.axialDistance(0, 0, q, r) <= 30) {
                if (isMove) {
                    this.hexGrid.setHover(q, r);
                }

                if (this.isMouseDown) {
                    if (this.interactionMode === 'tile') {
                        const selectedType = this.tilePalette.getSelectedType();
                        this.hexGrid.placeTile(q, r, selectedType);
                    } else {
                        this.triggerInteraction(q, r);
                    }
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

    /** マウス座標更新 */
    private updateMousePosition(event: MouseEvent): void {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    /** フレーム更新 */
    private update(deltaTime: number): void {
        this.timeManager.update(deltaTime);
        this.hexGrid.update(deltaTime);
    }
}


new App();
