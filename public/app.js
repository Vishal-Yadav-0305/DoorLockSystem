const trackForm = document.getElementById('track-form');
const analyzeForm = document.getElementById('analyze-form');
const trackStatus = document.getElementById('track-status');
const analysisStatus = document.getElementById('analysis-status');

const socialTotalEl = document.getElementById('social-total');
const thirdPartyTotalEl = document.getElementById('third-party-total');
const otherTotalEl = document.getElementById('other-total');
const eventTotalEl = document.getElementById('event-total');

const ctx = document.getElementById('trend-chart').getContext('2d');
let trendChart = null;

function updateTotals(totals, totalEvents) {
  socialTotalEl.textContent = totals.social_media;
  thirdPartyTotalEl.textContent = totals.third_party;
  otherTotalEl.textContent = totals.other;
  eventTotalEl.textContent = totalEvents;
}

function renderTrend(trend) {
  const labels = trend.map((entry) => entry.day);
  const scoreData = trend.map((entry) => entry.score);

  if (trendChart) {
    trendChart.destroy();
  }

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Footprint Usage Score',
          data: scoreData,
          borderColor: '#2f5bea',
          backgroundColor: 'rgba(47, 91, 234, 0.15)',
          fill: true,
          tension: 0.2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

trackForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const payload = {
    email: document.getElementById('email').value,
    appName: document.getElementById('appName').value,
    category: document.getElementById('category').value
  };

  const response = await fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const result = await response.json();

  if (!response.ok) {
    trackStatus.textContent = `Error: ${result.error}`;
    trackStatus.style.color = '#b00020';
    return;
  }

  trackStatus.textContent = 'Visit event saved.';
  trackStatus.style.color = '#056608';
  document.getElementById('lookup-email').value = payload.email;
});

analyzeForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('lookup-email').value.trim();
  if (!email) return;

  const response = await fetch(`/api/users/${encodeURIComponent(email)}/analytics`);
  const result = await response.json();

  if (!response.ok) {
    analysisStatus.textContent = `Error: ${result.error}`;
    analysisStatus.style.color = '#b00020';
    return;
  }

  analysisStatus.textContent = `Analytics loaded for ${result.email}.`;
  analysisStatus.style.color = '#056608';

  const { totals, trend, totalEvents } = result.analytics;
  updateTotals(totals, totalEvents);
  renderTrend(trend);
});
