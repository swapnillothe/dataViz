const chartSize = { width: 1200, height: 800 };
const margin = { left: 100, right: 10, top: 20, bottom: 150 };
const width = chartSize.width - margin.left - margin.right;
const height = chartSize.height - margin.top - margin.bottom;

const slow = () => d3.transition().duration(500).ease(d3.easeLinear);
const color = d3.scaleOrdinal(d3.schemeCategory10);
let _allQuotes, _transactions, _summary;

const initChart = () => {
  const svg = d3.select('#chart-area').append('svg')
    .attr('height', chartSize.height)
    .attr('width', chartSize.width);

  const g = svg.append('g')
    .attr('class', 'prices')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('text')
    .attr('class', 'x axis-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - margin.top)
    .text('Dates');

  g.append('text')
    .attr('class', 'y axis-label')
    .attr('x', -(height / 2))
    .attr('y', -60)
    .text('Prices');

  g.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(0,${height})`)

  g.append('g')
    .attr('class', 'y axis');


  g.append('path').attr('class', 'Close');
  g.append('path').attr('class', 'sma');

};
const initControls = (quotes) => {
  const toDateText = index => quotes[_.floor(index)].Date;
  const dateRangeToText = ([from, to]) => `${toDateText(from)} .. ${toDateText(to)}`;

  const slider = d3.sliderBottom()
    .min(0)
    .max(quotes.length - 1)
    .default([0, quotes.length - 1])
    .width(chartSize.width - margin.right - margin.left)
    .ticks(20)
    .tickFormat(i => quotes[_.floor(i)].Date.match(/(.*-.*)-/)[1])
    .fill('grey')
    .on('onchange', ([from,to]) => {
      d3.select('#fromDate').text(toDateText(from));
      d3.select('#toDate').text(toDateText(to));      
      updateChart(_.slice(_allQuotes, from, to + 1));
    });
  const pricesG = d3.select('.prices');
  pricesG.append('text')
    .attr('id','fromDate')
    .attr('transform',`translate(0,${height + margin.bottom/3})`)
    .text(_.first(quotes).Date);
  pricesG.append('text')
    .attr('id','toDate')
    .attr('transform',`translate(${width},${height + margin.bottom/3})`)
    .text(_.last(quotes).Date);
  const sliderG = pricesG.append('g')
    .attr('id', 'slider')
    .attr('transform', `translate(0,${height + margin.bottom / 2})`)
    .call(slider);
  document.querySelector('.controls [name=period]').addEventListener('change', (e) => recalculateAndDraw(+e.target.value));
}
const addDays = (date, days) => {
  const r = new Date(date);
  r.setTime(r.getTime() + days * 24 * 60 * 60 * 1000);
  return r;
}

const updateChart = (quotes) => {
  const svg = d3.select('#chart-area svg');
  const smas = _.map(_.filter(quotes, 'sma'), 'sma');
  const maxDomain = Math.max(_.maxBy(quotes, 'High').High, ...smas);
  const minDomain = Math.min(_.minBy(quotes, 'Low').Low, ...smas);

  const y = d3.scaleLinear()
    .domain([minDomain, maxDomain])
    .range([height, 0]);

  const yAxis = d3.axisLeft(y).ticks(10);
  svg.select('.y.axis').call(yAxis);

  const startTime = addDays(_.first(quotes).Time, -20);
  const endTime = addDays(_.last(quotes).Time, 20);
  const x = d3.scaleTime()
    .domain([startTime, endTime])
    .range([0, width]);


  const xAxis = d3.axisBottom(x);
  svg.select('.x.axis').call(xAxis);

  const pricesG = svg.select('.prices');
  const updatePath = field => {
    const line = d3.line().x(q => x(q.Time)).y(q => y(q[field]));
    pricesG.select(`path.${field}`).attr('d', line(_.filter(quotes, field)));
  }
  updatePath('Close');
  updatePath('sma');

}


const parseQuotes = ({ Date, Volume, ...rest }) => {
  _.forEach(rest, (v, k) => rest[k] = +v);
  return { Date, Time: new window.Date(Date), ...rest };
}

const detectTransactions = () => {
  const accumulateTrades = (transactions, q) => {
    const t = _.last(transactions);
    const isLong = t && t.buy && !t.sell;
    const goLong = q.Close > q.sma;
    const goShort = q.Close < q.sma;
    if (goLong && !isLong) transactions.push({ buy: q });
    if (goShort && isLong) t.sell = q;
    return transactions;
  };
  _transactions = _.reduce(_.filter(_allQuotes, 'sma'), accumulateTrades, []);
  const t = _.last(_transactions);
  if (!t.sell) t.sell = _.last(_allQuotes);
  _.forEach(_transactions, t => t.profit = t.sell.Close - t.buy.Close);
}
const computeSummary = () => {
  const winList = _.filter(_transactions, t => t.profit > 0);
  const lossList = _.filter(_transactions, t => t.profit <= 0);
  const wins = winList.length, losses = lossList.length;
  const played = wins + losses;
  const win_percent = _.round(wins * 100 / played);
  const netProfit = _.sumBy(winList, 'profit');
  const netLoss = - _.sumBy(lossList, 'profit');
  const average_win_size = _.round(netProfit / wins);
  const average_loss_size = _.round(netLoss / losses);
  const win_loss_multiple = _.round(average_win_size / average_loss_size, 1);
  const total_profit = _.round(netProfit - netLoss);
  const expectency = _.round(total_profit / played);
  _summary = { total_profit, played, expectency, wins, losses, win_percent, average_win_size, average_loss_size, win_loss_multiple };
}
const analyze = (quotes, period = 100) => {
  _.forEach(quotes, q => delete q.sma);
  let sum = 0;
  _.forEach(quotes, (q, i) => {
    const pStart = i - period;
    sum += q.Close;
    if (pStart >= 0) sum -= quotes[pStart].Close;
    if (pStart > 0) q.sma = _.round(sum / period);
  })
  detectTransactions();
  computeSummary();
}
const updateTransactionsSummary = () => {
  const r = x => _.round(x);
  const toFields = (t, i) => [i + 1, t.buy.Date, r(t.buy.Close), t.sell.Date, r(t.sell.Close), r(t.profit)];

  document.querySelector('.transactions table tbody').innerHTML = '';
  d3.select('.transactions table tbody').selectAll('tr')
    .data(_transactions)
    .enter()
    .append('tr')
    .selectAll('td')
    .data(toFields)
    .enter()
    .append('td')
    .text(_.identity);

  document.querySelector('.summary table tbody').innerHTML = '';
  const summaryTr = d3.select('.summary table tbody').selectAll('tr')
    .data(_.keys(_summary))
    .enter()
    .append('tr');

  summaryTr.append('th').text(k=>k.replace(/_/g,' '));
  summaryTr.append('td').text(k => _summary[k]);

}
const recalculateAndDraw = (period) => {
  analyze(_allQuotes, period);
  updateChart(_allQuotes);
  updateTransactionsSummary();
}
const startVisualization = (quotes) => {
  initChart();
  _allQuotes = quotes;
  initControls(quotes);
  recalculateAndDraw();
}
const main = () => {
  d3.csv('data/nifty.csv', parseQuotes).then(startVisualization);
}
window.onload = main;