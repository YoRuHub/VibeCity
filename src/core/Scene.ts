import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * シーン管理クラス
 * Three.jsのシーン、カメラ、レンダラー、ライトを一元管理
 */
export class Scene {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;

    private animationId: number | null = null;

    constructor(container: HTMLElement) {
        // シーンの初期化
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a0a);
        this.scene.fog = new THREE.Fog(0x0a0a0a, 50, 200);

        // カメラの初期化
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 40);

        // レンダラーの初期化
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // OrbitControlsの初期化
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 100;

        // ライトの初期化
        this.setupLights();

        // リサイズハンドラの登録
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * ライトのセットアップ
     */
    private setupLights(): void {
        // 環境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        // ディレクショナルライト（太陽光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 200;
        directionalLight.shadow.camera.left = -50;
        directionalLight.shadow.camera.right = 50;
        directionalLight.shadow.camera.top = 50;
        directionalLight.shadow.camera.bottom = -50;
        this.scene.add(directionalLight);
    }

    /**
     * リサイズハンドラ
     */
    private handleResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * アニメーションループの開始
     */
    public startAnimation(callback: (deltaTime: number) => void): void {
        let lastTime = performance.now();

        const animate = (): void => {
            this.animationId = requestAnimationFrame(animate);

            const currentTime = performance.now();
            const deltaTime = (currentTime - lastTime) / 1000;
            lastTime = currentTime;

            // コールバック実行
            callback(deltaTime);

            // コントロールの更新
            this.controls.update();

            // レンダリング
            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    /**
     * アニメーションループの停止
     */
    public stopAnimation(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * クリーンアップ
     */
    public dispose(): void {
        this.stopAnimation();
        this.controls.dispose();
        this.renderer.dispose();
        window.removeEventListener('resize', this.handleResize.bind(this));
    }
}
