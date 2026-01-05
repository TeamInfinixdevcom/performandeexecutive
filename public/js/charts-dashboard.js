// charts-dashboard.js
// Modular dashboard chart rendering for ExecutivePerformance
// Requires Chart.js loaded in index.html

class DashboardCharts {
  constructor() {
    this.charts = {};
  }

  // Render a line chart for client trends
  renderClientTrend(ctx, labels, data) {
    this._destroyChart('clientTrend');
    this.charts.clientTrend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Clientes por mes',
          data,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0,123,255,0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        animation: {duration: 1200, easing: 'easeOutQuart'},
        plugins: {legend: {display: true}, tooltip: {enabled: true}}
      }
    });
  }

  // Render a pie chart for segment distribution
  renderSegmentPie(ctx, labels, data) {
    this._destroyChart('segmentPie');
    this.charts.segmentPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          label: 'Segmentos',
          data,
          backgroundColor: ['#FFD700','#C0C0C0','#CD7F32','#222','#007bff'],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        animation: {duration: 1200, easing: 'easeOutBounce'},
        plugins: {legend: {position: 'bottom'}, tooltip: {enabled: true}}
      }
    });
  }

  // Render a bar chart for executive sales comparison
  renderExecutiveBar(ctx, labels, data) {
    this._destroyChart('executiveBar');
    this.charts.executiveBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Ventas por ejecutivo',
          data,
          backgroundColor: '#28a745',
          borderColor: '#218838',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        animation: {duration: 1200, easing: 'easeOutElastic'},
        plugins: {legend: {display: false}, tooltip: {enabled: true}},
        scales: {y: {beginAtZero: true}}
      }
    });
  }

  // Render a radar chart for segment performance
  renderSegmentRadar(ctx, labels, data) {
    this._destroyChart('segmentRadar');
    this.charts.segmentRadar = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'Desempeño por segmento',
          data,
          backgroundColor: 'rgba(40,167,69,0.2)',
          borderColor: '#28a745',
          pointBackgroundColor: '#28a745'
        }]
      },
      options: {
        responsive: true,
        animation: {duration: 1200, easing: 'easeOutCirc'},
        plugins: {legend: {position: 'top'}, tooltip: {enabled: true}}
      }
    });
  }

  // Destroy chart if exists
  _destroyChart(key) {
    if (this.charts[key]) {
      this.charts[key].destroy();
      this.charts[key] = null;
    }
  }
}

// Export for global usage
window.DashboardCharts = DashboardCharts;
