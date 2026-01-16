import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * シーン管理クラス
 * Three.jsのシーン、カメラ、レンダラー、ライトを一元管理
 */
export class Scene {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public controls: OrbitControls;
    public composer: EffectComposer;

    private animationId: number | null = null;

    constructor(container: HTMLElement) {
        // シーンの初期化
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000510);
        this.scene.fog = new THREE.Fog(0x000510, 30, 150);

        // カメラの初期化（低い位置から見上げる構図）
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 5, 20);
        this.camera.lookAt(0, 0, 0);

        // レンダラーの初期化
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(this.renderer.domElement);

        // OrbitControlsの初期化
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.2;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 100;

        // ライトの初期化
        this.setupLights();

        // ポストプロセッシングの初期化
        this.composer = this.setupPostProcessing();

        // リサイズハンドラの登録
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * ライトのセットアップ
     */
    private setupLights(): void {
        // 環境光（低めに設定）
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
        this.scene.add(ambientLight);

        // ディレクショナルライト（控えめ）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
        directionalLight.position.set(50, 50, 50);
        this.scene.add(directionalLight);
    }

    /**
     * ポストプロセッシングのセットアップ
     */
    private setupPostProcessing(): EffectComposer {
        const composer = new EffectComposer(this.renderer);

        // レンダーパス
        const renderPass = new RenderPass(this.scene, this.camera);
        composer.addPass(renderPass);

        // ブルームエフェクト
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        composer.addPass(bloomPass);

        return composer;
    }

    /**
     * リサイズハンドラ
     */
    private handleResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
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

            // ポストプロセッシングでレンダリング
            this.composer.render();
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
