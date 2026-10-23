import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../..', import.meta.url));

function plistStrings(xml, key) {
  const pattern = new RegExp(`<key>${key}</key>\\s*(<array>[\\s\\S]*?</array>|<string>[^<]*</string>)`);
  const match = xml.match(pattern);
  if (!match) return [];
  return [...match[1].matchAll(/<string>([^<]*)<\/string>/g)].map((item) => item[1]);
}

describe('iOS language packaging', () => {
  const plist = readFileSync(resolve(root, 'ios/App/App/Info.plist'), 'utf8');
  const project = readFileSync(resolve(root, 'ios/App/App.xcodeproj/project.pbxproj'), 'utf8');

  it('uses English as the bundle development region', () => {
    expect(plistStrings(plist, 'CFBundleDevelopmentRegion')).toEqual(['en']);
    expect(plist).not.toMatch(/<key>CFBundleDevelopmentRegion<\/key>\s*<string>zh-Hant<\/string>/);
    expect(project).toMatch(/developmentRegion = en;/);
    expect(project).not.toMatch(/developmentRegion = zh/);
  });

  it('declares English in the bundle localizations and does not make Chinese the only language', () => {
    const localizations = plistStrings(plist, 'CFBundleLocalizations');
    expect(localizations[0]).toBe('en');
    expect(localizations).toContain('en');
    expect(localizations).not.toEqual(['zh-Hant']);
    expect(localizations).not.toEqual(['zh-Hans']);
  });
});
