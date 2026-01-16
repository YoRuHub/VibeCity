import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// @ts-ignore
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

/**
 * シーン管理クラス
 * Three.jsのシーン、カメラ、レンダラー、ライトを一元管理
 */
export class Scene {
    public scene: any; // THREE.Scene
    public camera: any; // THREE.PerspectiveCamera
    public renderer: any; // THREE.WebGLRenderer
    public controls: any; // OrbitControls
    public composer: any; // EffectComposer

    private ambientLight!: any; // THREE.AmbientLight
    private sunLight!: any; // THREE.PointLight - 太陽の光

    private animationId: number | null = null;

    // 天動説世界の要素
    private ground!: any; // THREE.Mesh - 中心の大地（円形平面）
    private skyDome!: any; // THREE.Mesh - 天球ドーム
    private sun!: any; // THREE.Mesh - 太陽
    private moon!: any; // THREE.Mesh - 月
    private moonLight!: any; // THREE.PointLight - 月の光
    private stars!: any; // THREE.Points - 星

    // 時間帯ごとの色設定（現実世界に近い色）
    private readonly timeColors = {
        night: {  // 深夜 0-4時
            sky: new THREE.Color(0x0a1929),
            ground: new THREE.Color(0x1a3a4a),
            light: new THREE.Color(0x6688aa),
            ambient: new THREE.Color(0x202844),
            fog: new THREE.Color(0x0a1929),
            sunIntensity: 0.0,
            ambientIntensity: 0.1
        },
        dawn: {  // 夜明け 4-6時
            sky: new THREE.Color(0xff7e6b),  // オレンジピンク
            ground: new THREE.Color(0x3a4a5a),
            light: new THREE.Color(0xffa07a),
            ambient: new THREE.Color(0x5a6a7a),
            fog: new THREE.Color(0xff9a8a),
            sunIntensity: 0.3,
            ambientIntensity: 0.2
        },
        morning: {  // 朝 6-10時
            sky: new THREE.Color(0x87ceeb),  // 明るい青空
            ground: new THREE.Color(0x5dbcd2),
            light: new THREE.Color(0xfff8dc),
            ambient: new THREE.Color(0xb0d8e8),
            fog: new THREE.Color(0xa8d8f0),
            sunIntensity: 0.8,
            ambientIntensity: 0.4
        },
        day: {  // 昼 10-16時
            sky: new THREE.Color(0x5eb3e4),  // 鮮やかな青
            ground: new THREE.Color(0x5dbcd2),
            light: new THREE.Color(0xffffff),
            ambient: new THREE.Color(0xc0e0f0),
            fog: new THREE.Color(0x7ac8e8),
            sunIntensity: 1.0,
            ambientIntensity: 0.5
        },
        evening: {  // 夕方 16-19時
            sky: new THREE.Color(0xff9866),  // 夕焼けオレンジ
            ground: new THREE.Color(0x4a6a7a),
            light: new THREE.Color(0xffb080),
            ambient: new THREE.Color(0xc08860),
            fog: new THREE.Color(0xffa880),
            sunIntensity: 0.7,
            ambientIntensity: 0.3
        },
        dusk: {  // 夕暮れ 19-21時
            sky: new THREE.Color(0x4a5a8a),  // 薄暗い青紫
            ground: new THREE.Color(0x2a3a5a),
            light: new THREE.Color(0x8888cc),
            ambient: new THREE.Color(0x404860),
            fog: new THREE.Color(0x4a5a8a),
            sunIntensity: 0.2,
            ambientIntensity: 0.15
        }
    };

    constructor(container: HTMLElement) {
        // シーンの初期化
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x5eb3e4);  // 鮮やかな青空
        this.scene.fog = new THREE.Fog(0x5eb3e4, 50, 500);

        // カメラの初期化（HexArtスタイル）
        this.camera = new THREE.PerspectiveCamera(
            50,  // HexArtと同じFOV
            window.innerWidth / window.innerHeight,
            0.1,
            3000
        );
        this.camera.position.set(0, 5, 15);  // 低い位置から水平に近く
        this.camera.lookAt(0, 0, 0);

        // レンダラーの初期化
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;  // 明るく
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

        // 地平面の追加
        this.createGroundPlane();

        // ポストプロセッシングの初期化
        this.composer = this.setupPostProcessing();

        // 初期時間を夜に設定（デフォルト）
        this.setTime(22);

        // リサイズハンドラの登録
        window.addEventListener('resize', this.handleResize.bind(this));
    }

    /**
     * ライトのセットアップ
     */
    private setupLights(): void {
        // 環境光のみ（太陽は別途作成）
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(this.ambientLight);
    }

    /**
     * 中心の大地を作成（円形の平面）
     */
    private createGroundPlane(): void {
        const geometry = new THREE.CircleGeometry(200, 128);
        const material = new THREE.MeshStandardMaterial({
            color: 0x5dbcd2,  // シアン色
            roughness: 0.9,
            metalness: 0.1
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = 0;

        this.scene.add(this.ground);

        // 天球ドームの作成
        this.createSkyDome();

        // 太陽の作成
        this.createSun();
    }

    /**
     * 天球ドームを作成
     */
    private createSkyDome(): void {
        const geometry = new THREE.SphereGeometry(500, 64, 64, 0, Math.PI * 2, 0, Math.PI / 2);
        const material = new THREE.MeshBasicMaterial({
            color: 0x5eb3e4,  // 青空
            side: THREE.BackSide,
            fog: false
        });

        this.skyDome = new THREE.Mesh(geometry, material);
        this.skyDome.position.y = 0;
        this.scene.add(this.skyDome);
    }

    /**
     * 太陽を作成
     */
    private createSun(): void {
        const geometry = new THREE.SphereGeometry(20, 32, 32);  // 大きめ
        const material = new THREE.MeshStandardMaterial({
            color: 0x8CD4CD,  // 青緑色
            emissive: 0xffffff,  // 白い輝き
            emissiveIntensity: 3.0  // 強く輝く
        });

        this.sun = new THREE.Mesh(geometry, material);
        // PointLightを弱める
        this.sunLight = new THREE.PointLight(0xffffee, 0.3, 2000);
        this.sunLight.castShadow = true;
        this.sun.add(this.sunLight);

        this.scene.add(this.sun);

        // 月の作成
        this.createMoon();

        // 星の作成
        this.createStars();
    }

    /**
     * 月を作成（カスタムシェーダー）
     */
    private createMoon(): void {
        const geometry = new THREE.SphereGeometry(18, 32, 32);

        // カスタムシェーダーで月を美しく
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 }
            },
            vertexShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                
                void main() {
                    vNormal = normalize(normalMatrix * normal);
                    vPosition = position;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                varying vec3 vNormal;
                varying vec3 vPosition;
                uniform float time;
                
                void main() {
                    // 月の基本色（淡い青白）
                    vec3 moonColor = vec3(0.95, 0.95, 1.0);
                    
                    // 光の方向（太陽からの光を想定）
                    vec3 lightDir = normalize(vec3(1.0, 0.5, 0.0));
                    
                    // 拡散反射
                    float diff = max(dot(vNormal, lightDir), 0.0);
                    diff = pow(diff, 0.7); // ソフトな陰影
                    
                    // 環境光
                    float ambient = 0.3;
                    
                    // 輝き
                    float brightness = ambient + diff * 0.7;
                    
                    // 月のクレーター風の模様（ノイズ）
                    float pattern = sin(vPosition.x * 10.0) * 0.5 + 0.5;
                    pattern *= sin(vPosition.y * 8.0) * 0.5 + 0.5;
                    pattern = pattern * 0.1 + 0.9;
                    
                    vec3 finalColor = moonColor * brightness * pattern;
                    
                    // 縁を明るく（リムライト）
                    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
                    rim = pow(rim, 3.0) * 0.5;
                    finalColor += vec3(rim);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }
            `
        });

        this.moon = new THREE.Mesh(geometry, material);

        // 月の光
        this.moonLight = new THREE.PointLight(0xddeeff, 0.4, 1500);
        this.moonLight.castShadow = true;
        this.moon.add(this.moonLight);

        this.scene.add(this.moon);
    }

    /**
     * 星を作成（カスタムシェーダー）
     */
    private createStars(): void {
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI / 2;
            const radius = 480;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            // ランダムな色（白〜青白〜黄白）
            const colorVariation = Math.random();
            if (colorVariation < 0.7) {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 1.0;
            } else if (colorVariation < 0.85) {
                colors[i * 3] = 0.9;
                colors[i * 3 + 1] = 0.95;
                colors[i * 3 + 2] = 1.0;
            } else {
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.95;
                colors[i * 3 + 2] = 0.85;
            }

            // ランダムなサイズ
            sizes[i] = Math.random() * 3 + 2;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        // カスタムシェーダー
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0.0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    
                    // キラキラ効果
                    float twinkle = sin(time * 2.0 + position.x * 0.01) * 0.3 + 0.7;
                    gl_PointSize = size * twinkle;
                    
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    // 円形グラデーション
                    float dist = length(gl_PointCoord - vec2(0.5));
                    if (dist > 0.5) discard;
                    
                    // 滑らかなグラデーション
                    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
                    alpha = pow(alpha, 2.0);
                    
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });

        this.stars = new THREE.Points(geometry, material);
        this.scene.add(this.stars);
    }

    /**
     * 時間に応じたシーンの更新
     * @param time 0.0 - 24.0
     */
    public setTime(time: number): void {
        let fromColor, toColor, lerpFactor;

        // 時間帯判定と補間係数の計算（6段階に細分化）
        if (time >= 0 && time < 4) {
            // 深夜 (0-4)
            fromColor = this.timeColors.night;
            toColor = this.timeColors.night;
            lerpFactor = 0;
        } else if (time >= 4 && time < 6) {
            // 明け方 (4-6)
            fromColor = this.timeColors.night;
            toColor = this.timeColors.dawn;
            lerpFactor = (time - 4) / 2;
        } else if (time >= 6 && time < 8) {
            // 朝焼け (6-8)
            fromColor = this.timeColors.dawn;
            toColor = this.timeColors.morning;
            lerpFactor = (time - 6) / 2;
        } else if (time >= 8 && time < 10) {
            // 朝から昼へ (8-10)
            fromColor = this.timeColors.morning;
            toColor = this.timeColors.day;
            lerpFactor = (time - 8) / 2;
        } else if (time >= 10 && time < 16) {
            // 昼 (10-16)
            fromColor = this.timeColors.day;
            toColor = this.timeColors.day;
            lerpFactor = 0;
        } else if (time >= 16 && time < 18) {
            // 昼から夕方へ (16-18)
            fromColor = this.timeColors.day;
            toColor = this.timeColors.evening;
            lerpFactor = (time - 16) / 2;
        } else if (time >= 18 && time < 20) {
            // 夕暮れ (18-20)
            fromColor = this.timeColors.evening;
            toColor = this.timeColors.dusk;
            lerpFactor = (time - 18) / 2;
        } else {
            // 夜 (20-24)
            fromColor = this.timeColors.dusk;
            toColor = this.timeColors.night;
            lerpFactor = (time - 20) / 4;
        }

        // 補間処理
        if (this.scene.background instanceof THREE.Color) {
            this.scene.background.lerpColors(fromColor.sky, toColor.sky, lerpFactor);
        }
        if (this.scene.fog instanceof THREE.Fog) {
            this.scene.fog.color.lerpColors(fromColor.fog, toColor.fog, lerpFactor);
        }

        this.ambientLight.color.lerpColors(fromColor.ambient, toColor.ambient, lerpFactor);
        this.ambientLight.intensity = this.lerp(fromColor.ambientIntensity, toColor.ambientIntensity, lerpFactor);

        // 太陽の光の色と強度を更新
        if (this.sunLight) {
            this.sunLight.color.lerpColors(fromColor.light, toColor.light, lerpFactor);
            this.sunLight.intensity = this.lerp(fromColor.sunIntensity, toColor.sunIntensity, lerpFactor) * 2;
        }

        // 地面の色を更新
        if (this.ground && this.ground.material) {
            this.ground.material.color.lerpColors(fromColor.ground, toColor.ground, lerpFactor);
        }

        // 天球ドームの色を更新
        if (this.skyDome && this.skyDome.material) {
            this.skyDome.material.color.lerpColors(fromColor.sky, toColor.sky, lerpFactor);
        }

        // 太陽を軌道上で移動（HexArtスタイル）
        if (this.sun) {
            const sunAngle = (time / 24) * Math.PI * 2 - Math.PI / 2;
            const sunRadius = 300;

            this.sun.position.set(
                Math.cos(sunAngle) * sunRadius,
                Math.sin(sunAngle) * sunRadius,
                -50
            );

            // 地平線より上にあるときだけ表示
            this.sun.visible = this.sun.position.y > 0;
        }

        // 月を軌道上で移動（太陽の反対側）
        if (this.moon) {
            const moonAngle = (time / 24) * Math.PI * 2 - Math.PI / 2 + Math.PI;
            const moonRadius = 320;

            this.moon.position.set(
                Math.cos(moonAngle) * moonRadius,
                Math.sin(moonAngle) * moonRadius,
                -50
            );

            // 地平線より上にあるときだけ表示
            this.moon.visible = this.moon.position.y > 0;
        }

        // 星の表示制御（夜のみ）
        if (this.stars) {
            this.stars.visible = time < 6 || time >= 18;
            // 夕方から夜にかけて徐々に明るく
            if (time >= 18 && time < 20) {
                const starFade = (time - 18) / 2;
                this.stars.material.opacity = starFade;
            } else if (time >= 4 && time < 6) {
                const starFade = 1 - (time - 4) / 2;
                this.stars.material.opacity = starFade;
            } else if (time >= 20 || time < 4) {
                this.stars.material.opacity = 1;
            }
            this.stars.material.transparent = true;
        }
    }

    private lerp(v0: number, v1: number, t: number): number {
        return v0 * (1 - t) + v1 * t;
    }

    /**
     * ポストプロセッシングのセットアップ
     */
    private setupPostProcessing(): any {
        const composer = new EffectComposer(this.renderer);

        const renderPass = new RenderPass(this.scene, this.camera);
        composer.addPass(renderPass);

        // Bloom効果（太陽のグロー用）
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,   // strength - 強いグロー
            0.8,   // radius - 広く
            0.7    // threshold - 太陽だけ輝く
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

    private lastTime = performance.now();
    private animationCallback: ((deltaTime: number) => void) | null = null;

    /**
     * アニメーションループ
     */
    private animate = (): void => {
        this.animationId = requestAnimationFrame(this.animate);

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // コールバック実行
        if (this.animationCallback) {
            this.animationCallback(deltaTime);
        }

        // 星のキラキラアニメーション
        if (this.stars && this.stars.material.uniforms && this.stars.material.uniforms.time) {
            this.stars.material.uniforms.time.value = performance.now() * 0.001;
        }

        // 月のシェーダー更新
        if (this.moon && this.moon.material.uniforms && this.moon.material.uniforms.time) {
            this.moon.material.uniforms.time.value = performance.now() * 0.001;
        }

        // コントロールの更新
        this.controls.update();

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * アニメーションループの開始
     */
    public startAnimation(callback: (deltaTime: number) => void): void {
        this.animationCallback = callback;
        this.animate();
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
