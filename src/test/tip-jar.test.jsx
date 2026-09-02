/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { TipJar } from '../components/TipJar.jsx';
import { TIP_COPY, TIP_PRODUCT_IDS, TIP_TIERS } from '../lib/iap.js';

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

async function renderTipJar(props = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  await act(async () => {
    root.render(
      <TipJar
        open
        onClose={() => {}}
        isNativeStorefront={() => false}
        loadTipProducts={async () => TIP_TIERS.map((t) => ({ ...t, priceString: t.fallbackPrice }))}
        purchaseTip={async (productId) => ({ ok: true, mocked: true, productId })}
        restoreTips={async () => ({
          ok: true,
          restored: false,
          consumable: true,
          message: TIP_COPY.restoreNothing,
        })}
        {...props}
      />,
    );
    await Promise.resolve();
    await Promise.resolve();
  });
  return { host, root };
}

describe('TipJar UI smoke', () => {
  it('renders the sheet title, both tip tiers, and restore', async () => {
    const { host, root } = await renderTipJar();
    expect(host.textContent).toContain('支持一下');
    expect(host.textContent).toContain('請飲杯凍檸茶');
    expect(host.textContent).toContain('$0.99');
    expect(host.textContent).toContain('$4.99');
    expect(host.textContent).toContain('請飲杯啡');
    expect(host.textContent).toContain('恢復購買');
    root.unmount();
  });

  it('shows 唔該晒 after a successful mock purchase', async () => {
    const { host, root } = await renderTipJar();
    const lemon = [...host.querySelectorAll('button')]
      .find((btn) => btn.textContent.includes('請飲杯凍檸茶'));
    expect(lemon).toBeTruthy();
    await act(async () => {
      lemon.click();
    });
    expect(host.textContent).toContain('唔該晒');
    root.unmount();
  });

  it('shows the consumable restore message', async () => {
    const { host, root } = await renderTipJar();
    const restore = [...host.querySelectorAll('button')]
      .find((btn) => btn.textContent.includes('恢復購買'));
    await act(async () => {
      restore.click();
    });
    expect(host.textContent).toContain(TIP_COPY.restoreNothing);
    expect(TIP_PRODUCT_IDS.lemonTea).toContain('tip.lemontea');
    root.unmount();
  });
});
