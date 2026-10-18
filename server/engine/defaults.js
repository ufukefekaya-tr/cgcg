// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/** Synthetic examples only. The codes and dimensions require operator verification. */
export const DEFAULT_GENERIC_PROFILE = {
    id: 'demo-millimetre',
    name: 'Synthetic generic XY profile',
    controllerType: 'generic',
    table: { width: 1000, height: 1000 },
    softLimits: { xMin: 0, xMax: 1000, yMin: 0, yMax: 1000, zMin: -50, zMax: 100 },
    workOffset: { x: 0, y: 0, z: 0 },
    safeHeight: 5,
    workCoordinate: 'G54',
    rapidSpeed: 10000,
    defaultFeedRate: 1000,
    operatorVerifiedMachineZero: null,
    mCodes: {
        pourOn: 'M04', pourOff: 'M05', washOn: 'M32', washOff: 'M33',
        blowOn: 'M59', blowOff: 'M58', coolantOn: 'M08', coolantOff: 'M09',
        programEnd: 'M30', spindleCW: 'M03',
    },
    gCodes: {
        rapid: 'G00', linear: 'G01', arcCW: 'G02', arcCCW: 'G03',
        absolute: 'G90', relative: 'G91', dwell: 'G04', machineCoord: 'G53',
    },
};
export const SYNTHETIC_NEUTRAL_PROFILE = DEFAULT_GENERIC_PROFILE;
export const DEMO_PROFILE = DEFAULT_GENERIC_PROFILE;
export const DEMO_REQUEST = {
    machineProfile: DEFAULT_GENERIC_PROFILE,
    use2AxisOnly: true,
    geometry: {
        patternType: 'rectangleGrid', width: 200, height: 140, gridRows: 3, gridCols: 3,
        gapX: 60, gapY: 60, startX: 130, startY: 180, cornerRadius: 0,
    },
    process: {
        feedRate: 1000, dryRun: true, use2AxisOnly: true, preDwell: 0, postDwell: 0,
        washEnabled: false, blowEnabled: false, earlyCloseEnabled: false,
        prePourPrimingEnabled: false, forceExplicitF: true,
    },
};
// Explicit controller dialect examples, with synthetic dimensions and I/O mappings.
// They are not verified profiles for any physical machine.
export const DEFAULT_FALCON_PROFILE = { ...DEFAULT_GENERIC_PROFILE, id: 'synthetic-falcon', name: 'Synthetic Falcon dialect example', controllerType: 'falcon' };
export const DEFAULT_FANUC_PROFILE = { ...DEFAULT_GENERIC_PROFILE, id: 'synthetic-fanuc', name: 'Synthetic Fanuc dialect example', controllerType: 'fanuc' };
export const DEFAULT_SIEMENS_PROFILE = { ...DEFAULT_GENERIC_PROFILE, id: 'synthetic-siemens', name: 'Synthetic Siemens dialect example', controllerType: 'siemens' };
