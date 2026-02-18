(function() {
  'use strict';

  const script = document.currentScript;
  const config = {
    partner: script.getAttribute('data-partner') || 'unknown',
    format: script.getAttribute('data-format') || 'leaderboard',
    apiBase: script.src.replace('/widget.js', ''),
    dealsUrl: script.getAttribute('data-deals-url') || null,
  };

  const formats = {
    leaderboard: { width: '728px', height: '90px', limit: 2 },
    skyscraper: { width: '160px', height: '600px', limit: 3 },
    sidebar: { width: '300px', height: 'auto', limit: 2 },
  };

  const format = formats[config.format] || formats.leaderboard;
  const limit = parseInt(script.getAttribute('data-limit')) || format.limit;
  const isLeaderboard = config.format === 'leaderboard';
  const isSkyscraper = config.format === 'skyscraper';

  // Truncate long Amazon titles to clean short names
  function cleanName(name, maxLength = 40) {
    if (!name) return '';
    // Remove common Amazon SEO suffixes
    let clean = name
      .replace(/\s*[-–|,]\s*(Amazon|for|with|and).*$/i, '')
      .replace(/\s*\([^)]*\)\s*$/, '')  // Remove trailing parentheses
      .trim();
    if (clean.length > maxLength) {
      clean = clean.substring(0, maxLength).trim() + '…';
    }
    return clean;
  }

  const container = document.createElement('div');
  container.id = 'dealsignal-widget';
  const shadow = container.attachShadow({ mode: 'open' });

  const styles = `
    :host {
      display: block;
      width: ${format.width};
      ${format.height !== 'auto' ? `height: ${format.height};` : ''}
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    .ds-widget {
      width: 100%;
      height: 100%;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      flex-direction: ${isLeaderboard ? 'row' : 'column'};
      ${isLeaderboard ? 'align-items: center;' : ''}
    }

    .ds-branding {
      ${isLeaderboard ? `
        padding: 0 28px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 6px;
        flex-shrink: 0;
        border-right: 1px solid rgba(255,255,255,0.06);
      ` : `
        padding: 18px 20px 14px;
        ${isSkyscraper ? 'text-align: center; padding: 20px 14px 16px;' : ''}
      `}
    }

    .ds-title {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.9);
      letter-spacing: -0.01em;
      display: flex;
      align-items: center;
      gap: 6px;
      ${isSkyscraper ? 'justify-content: center;' : ''}
    }

    .ds-icon {
      width: 14px;
      height: 14px;
      opacity: 0.7;
    }

    .ds-subtitle {
      font-size: 11px;
      color: rgba(255,255,255,0.4);
    }

    .ds-deals {
      flex: 1;
      display: flex;
      flex-direction: ${isLeaderboard ? 'row' : 'column'};
      ${isLeaderboard ? 'align-items: center; height: 100%;' : ''}
      overflow: hidden;
    }

    .ds-deal {
      ${isLeaderboard ? 'height: 100%; flex-shrink: 0;' : ''}
      display: flex;
      ${isSkyscraper ? 'flex-direction: column; align-items: center; text-align: center;' : 'flex-direction: row;'}
      align-items: center;
      gap: ${isSkyscraper ? '10px' : '12px'};
      padding: ${isLeaderboard ? '0 16px' : isSkyscraper ? '16px 14px' : '14px 20px'};
      text-decoration: none;
      color: white;
      transition: background 0.15s;
      ${isLeaderboard ? 'border-right: 1px solid rgba(255,255,255,0.06);' : 'border-bottom: 1px solid rgba(255,255,255,0.05);'}
    }
    .ds-deal:last-child { border-right: none; }
    .ds-deal:last-child { border-bottom: none; }
    .ds-deal:hover { background: rgba(255,255,255,0.03); }

    .ds-image {
      width: ${isSkyscraper ? '64px' : '56px'};
      height: ${isSkyscraper ? '64px' : '56px'};
      object-fit: contain;
      background: white;
      border-radius: 8px;
      flex-shrink: 0;
      padding: 4px;
    }

    .ds-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      ${isLeaderboard ? '' : 'flex: 1; min-width: 0;'}
    }

    .ds-name {
      font-size: 13px;
      font-weight: 500;
      color: rgba(255,255,255,0.9);
      line-height: 1.3;
      overflow: hidden;
      ${isSkyscraper ? `
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      ` : 'white-space: nowrap; text-overflow: ellipsis; max-width: 180px;'}
    }

    .ds-status {
      font-size: 12px;
      font-weight: 600;
      color: #35ffb5;
      ${isSkyscraper ? 'text-align: center;' : ''}
    }

    .ds-footer {
      padding: ${isSkyscraper ? '16px 14px 20px' : '12px 20px 14px'};
      ${isSkyscraper ? 'text-align: center;' : ''}
      border-top: 1px solid rgba(255,255,255,0.05);
    }

    .ds-link {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      transition: color 0.15s;
    }
    .ds-link:hover { color: rgba(255,255,255,0.8); }

    .ds-loading {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.3);
      font-size: 11px;
    }
  `;

  shadow.innerHTML = `<style>${styles}</style><div class="ds-widget"><div class="ds-loading">Loading...</div></div>`;
  script.parentNode.insertBefore(container, script);

  async function loadDeals() {
    try {
      const response = await fetch(`${config.apiBase}/api/deals?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const deals = await response.json();

      if (!deals.length) {
        shadow.innerHTML = `<style>${styles}</style><div class="ds-widget"><div class="ds-loading">No deals detected</div></div>`;
        return;
      }

      const dealsUrl = config.dealsUrl || `${config.apiBase}/deals?partner=${config.partner}`;

      const nameLimit = isSkyscraper ? 50 : 28;
      const dealsHtml = deals.map(deal => `
        <a href="${deal.affiliate_url || '#'}" target="_blank" rel="noopener noreferrer" class="ds-deal" data-product-id="${deal.id}">
          <img src="${deal.image_url || ''}" alt="" class="ds-image" />
          <div class="ds-info">
            <div class="ds-name">${cleanName(deal.name, nameLimit)}</div>
            <div class="ds-status">
              ↓ ${deal.discount_percent}%
            </div>
          </div>
        </a>
      `).join('');

      let html;
      if (isLeaderboard) {
        html = `
          <div class="ds-widget">
            <div class="ds-branding">
              <div class="ds-title"><svg class="ds-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Gaming gear tracker</div>
              <a href="${dealsUrl}" target="_blank" rel="noopener noreferrer" class="ds-link">View all deals</a>
            </div>
            <div class="ds-deals">${dealsHtml}</div>
          </div>
        `;
      } else {
        html = `
          <div class="ds-widget">
            <div class="ds-branding">
              <div class="ds-title"><svg class="ds-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>Gaming gear tracker</div>
            </div>
            <div class="ds-deals">${dealsHtml}</div>
            <div class="ds-footer">
              <a href="${dealsUrl}" target="_blank" rel="noopener noreferrer" class="ds-link">View all deals</a>
            </div>
          </div>
        `;
      }

      shadow.innerHTML = `<style>${styles}</style>${html}`;

      shadow.querySelectorAll('.ds-deal').forEach(el => {
        el.addEventListener('click', () => {
          fetch(`${config.apiBase}/api/clicks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: el.dataset.productId, partner_site: config.partner }),
          }).catch(() => {});
        });
      });

    } catch (error) {
      shadow.innerHTML = `<style>${styles}</style><div class="ds-widget"><div class="ds-loading">Unable to load</div></div>`;
    }
  }

  loadDeals();
})();
