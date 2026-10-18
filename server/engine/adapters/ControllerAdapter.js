// Copyright 2026 Ufuk Efe Kaya. SPDX-License-Identifier: MIT OR Apache-2.0.
/**
 * engine/adapters/ControllerAdapter.ts
 * Base adapter interface + factory function.
 * All M/G codes read from MachineProfile — ZERO hardcode.
 */
import { normalizeMachineProfile } from '../validateInput.js';
// ─── Base Adapter (reads everything from profile) ───────────
class BaseAdapter {
    profile;
    constructor(profile) {
        this.profile = profile;
    }
    rapid() { return this.profile.gCodes.rapid; }
    linear() { return this.profile.gCodes.linear; }
    arcCW() { return this.profile.gCodes.arcCW; }
    arcCCW() { return this.profile.gCodes.arcCCW; }
    absoluteMode() { return this.profile.gCodes.absolute; }
    relativeMode() { return this.profile.gCodes.relative; }
    pourOn() { return this.profile.mCodes.pourOn; }
    pourOff() { return this.profile.mCodes.pourOff; }
    washOn() { return this.profile.mCodes.washOn; }
    washOff() { return this.profile.mCodes.washOff; }
    blowOn() { return this.profile.mCodes.blowOn; }
    blowOff() { return this.profile.mCodes.blowOff; }
    coolantOn() { return this.profile.mCodes.coolantOn; }
    coolantOff() { return this.profile.mCodes.coolantOff; }
    programEnd() { return this.profile.mCodes.programEnd; }
    spindleCW() { return this.profile.mCodes.spindleCW; }
    dwell(ms) {
        return `${this.profile.gCodes.dwell} P${ms}`;
    }
    workCoord(n = 54) {
        return this.profile.workCoordinate;
    }
    machineCoord() {
        return this.profile.gCodes.machineCoord;
    }
    machineZero() {
        return this.profile.operatorVerifiedMachineZero?.verified === true ? this.profile.operatorVerifiedMachineZero.command : null;
    }
    formatCoord(axis, value) {
        return `${axis}${value.toFixed(3)}`;
    }
}
// ─── Falcon Adapter ─────────────────────────────────────────
export class FalconAdapter extends BaseAdapter {
    constructor(profile) {
        super(profile);
    }
    // Override dwell for FALCON: G04 X{seconds} instead of P{ms}
    dwell(ms) {
        const seconds = ms / 1000;
        let s = seconds.toString();
        if (!s.includes('.'))
            s += '.0';
        return `${this.profile.gCodes.dwell} X${s}`;
    }
}
// ─── Fanuc Adapter (skeleton) ───────────────────────────────
export class FanucAdapter extends BaseAdapter {
    constructor(profile) {
        super(profile);
    }
}
// ─── Siemens Adapter (skeleton) ─────────────────────────────
export class SiemensAdapter extends BaseAdapter {
    constructor(profile) {
        super(profile);
    }
}
// ─── Factory ────────────────────────────────────────────────
export function createAdapter(profile) {
    profile = normalizeMachineProfile(profile);
    switch (profile.controllerType) {
        case 'falcon':
            return new FalconAdapter(profile);
        case 'fanuc':
            return new FanucAdapter(profile);
        case 'siemens':
            return new SiemensAdapter(profile);
        case 'generic':
            return new BaseAdapter(profile);
        default:
            throw new TypeError('Unsupported controller type');
    }
}
