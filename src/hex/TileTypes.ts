import * as THREE from 'three';

/**
 * タイルの種類
 */
export enum TileType {
    Empty = 'empty',   // 空（デフォルト）
    Road = 'road',     // 道
    Water = 'water',   // 水
    Grass = 'grass',   // 草地
    Stone = 'stone'    // 石畳
}

/**
 * タイルの視覚的定義
 */
export interface TileDefinition {
    /** タイルの種類 */
    type: TileType;
    /** 表示色 */
    color: THREE.Color;
    /** 高さ（3D押し出しの深さ） */
    height: number;
}

/**
 * タイル定義
 * 各タイプの視覚的特性を定義
 */
export const TILE_DEFINITIONS: Record<TileType, TileDefinition> = {
    [TileType.Empty]: {
        type: TileType.Empty,
        color: new THREE.Color(0x000000),
        height: 0,
    },
    [TileType.Road]: {
        type: TileType.Road,
        color: new THREE.Color(0x8B6F47), // 茶色
        height: 0.3,
    },
    [TileType.Water]: {
        type: TileType.Water,
        color: new THREE.Color(0x4FC3F7), // 明るい青
        height: 0.15,
    },
    [TileType.Grass]: {
        type: TileType.Grass,
        color: new THREE.Color(0x4CAF50), // 緑
        height: 0.2,
    },
    [TileType.Stone]: {
        type: TileType.Stone,
        color: new THREE.Color(0x78909C), // グレー
        height: 0.25,
    }
};

/**
 * UI用カラーパレット
 */
export const TILE_PALETTE_COLORS: Record<TileType, string> = {
    [TileType.Empty]: '#000000',
    [TileType.Road]: '#8B6F47',
    [TileType.Water]: '#4FC3F7',
    [TileType.Grass]: '#4CAF50',
    [TileType.Stone]: '#78909C'
};
