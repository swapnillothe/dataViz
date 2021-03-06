const chartSize = { width: 1200, height: 800 };
const margin = { left: 100, right: 10, top: 20, bottom: 150 };
const width = chartSize.width - margin.left - margin.right;
const height = chartSize.height - margin.top - margin.bottom;

const slow = () => d3.transition().duration(500).ease(d3.easeLinear);
const color = d3.scaleOrdinal(d3.schemeCategory10);
let _allQuotes, _transactions, _summary, slider;
const readControl = name => +document.querySelector(`.controls #${name}`).value;
const readSMA1 = () => readControl('sma1') || 100;
const readTolerance = () => readControl('tolerance') || 0;
let showQuoteLines;
const getVisibleQuotes = () => {
  const range = slider.value();
  const [from, to] = range;
  return range && _.slice(_allQuotes, from, to + 1) || _allQuotes;
}
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
  smas.forEach(s => g.append('path').attr('class', s).attr('stroke', color(s)));

  const crosshairG = g.append('g').attr('class', 'crosshair');
  const linesG = crosshairG.append('g').attr('class','lines hidden');
  const showCrossHair = () => document.querySelector('.crosshair .lines').classList.remove('hidden');
  const hideCrossHair = () => document.querySelector('.crosshair .lines').classList.add('hidden');
  
  linesG.append('line').attr('class', 'x hover-line').attr('y1', 0).attr('y2', height);
  linesG.append('line').attr('class', 'y hover-line').attr('x1', 0).attr('x2', width);
  linesG.append('text').attr('class','x').attr('y',height);
  linesG.append('text').attr('class','y').attr('x',0);
  const crosshairRect = crosshairG.append('rect').attr('width', width).attr('height', height);
  crosshairRect.on('mouseover', showCrossHair).on('mouseout', hideCrossHair).on('mousemove', function(){showQuoteLines(this)});

};

const initOutComes = () => {
  const svg = d3.select('.outcomes').append('svg')
    .attr('height', chartSize.height)
    .attr('width', chartSize.width);

  const g = svg.append('g')
    .attr('class', 'profit')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('text')
    .attr('class', 'x axis-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - margin.top)
    .text('Trades');

  g.append('text')
    .attr('class', 'y axis-label')
    .attr('x', -(height / 2))
    .attr('y', -60)
    .text('Profit');

  g.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(0,${height})`)

  g.append('g')
    .attr('class', 'y axis');

  g.append('g').attr('class', 'profits');

}

const initControls = () => {
  const watchChange = name => document.querySelector(`.controls #${name}`).addEventListener('change', recalculateAndDraw);
  'sma1,sma2,sma3,tolerance'.split(',').forEach(watchChange);

  slider = d3.sliderBottom()
    .min(0)
    .max(_allQuotes.length - 1)
    .default([0, _allQuotes.length - 1])
    .width(width)
    .ticks(20)
    .tickFormat(i => _allQuotes[_.floor(i)].Date.match(/(.*-.*)-/)[1])
    .fill('grey')
    .on('onchange', updateChart);

  const pricesG = d3.select('.prices');
  pricesG.append('text')
    .attr('id', 'fromDate')
    .attr('transform', `translate(0,${height + margin.bottom / 3})`)
  pricesG.append('text')
    .attr('id', 'toDate')
    .attr('transform', `translate(${width},${height + margin.bottom / 3})`)
  pricesG.append('g')
    .attr('id', 'slider')
    .attr('transform', `translate(-${margin.right},${height + margin.bottom / 2})`)
    .call(slider);
}
const addDays = (date, days) => {
  const r = new Date(date);
  r.setTime(r.getTime() + days * 24 * 60 * 60 * 1000);
  return r;
}

const updateChart = () => {
  const quotes = getVisibleQuotes();
  d3.select('#fromDate').text(_.first(quotes).Date);
  d3.select('#toDate').text(_.last(quotes).Date);
  const svg = d3.select('#chart-area svg');
  const smaValues = _.filter(_.flatten(_.map(smas, s => _.map(quotes, s))), _.identity);
  const maxDomain = Math.max(_.maxBy(quotes, 'High').High, ...smaValues);
  const minDomain = Math.min(_.minBy(quotes, 'Low').Low, ...smaValues);

  const y = d3.scaleLinear()
    .domain([minDomain, maxDomain])
    .range([height, 0]);

  const yAxis = d3.axisLeft(y).ticks(20);
  svg.select('.y.axis').call(yAxis);


  const startTime = _.first(quotes).Time;
  const endTime = _.last(quotes).Time;
  const x = d3.scaleTime()
    .domain([startTime, endTime])
    .range([0, width]);

  svg.selectAll('.y.axis .tick line')
    .attr('x2', x.range()[1]);


  const xAxis = d3.axisBottom(x).ticks(20);
  svg.select('.x.axis').call(xAxis);

  svg.selectAll('.x.axis .tick line')
    .attr('y2', -y.range()[0]);

  const pricesG = svg.select('.prices');
  const updatePath = field => {
    const line = d3.line().x(q => x(q.Time)).y(q => y(q[field]));
    pricesG.select(`path.${field}`).attr('d', line(_.filter(quotes, field)));
  }
  updatePath('Close');
  smas.forEach(updatePath);
  showQuoteLines = function(e){
    //d3.select('.x.hover-line').attr('x',0).attr('y2',height);
    const [rx,ry] = d3.mouse(e);
   
    const time = x.invert(rx);
    const q = _.findLast(_allQuotes, q=> q.Time <= time);
    //console.log(dx);
    //console.log(q.Close, q.Date);
    const [nx, ny] = [x(q.Time),y(q.Close)];
    d3.select('.x.hover-line').attr('x1',nx).attr('x2',nx);
    d3.select('.y.hover-line').attr('y1',ny).attr('y2',ny);
    d3.select('.crosshair .lines text.x').attr('x',rx).text(q.Date);
    d3.select('.crosshair .lines text.y').attr('y',ry).text(q.Close);
  }

}

const updateOutcomes = () => {
  const svg = d3.select('.outcomes svg');
  const maxDomain = _.maxBy(_transactions, 'profit').profit;
  const minDomain = _.minBy(_transactions, 'profit').profit;

  const y = d3.scaleLinear()
    .domain([minDomain, maxDomain])
    .range([height, 0]);

  const yAxis = d3.axisLeft(y).ticks(20);
  svg.select('.y.axis').call(yAxis);

  const x = d3.scaleBand()
    .domain(_.times(_transactions.length))
    .range([0, width])
    .padding(0.3);

  svg.selectAll('.y.axis .tick line')
    .attr('x2', x.range()[1]);

  const xAxis = d3.axisBottom(x).ticks(20).tickFormat(i => i + 1);
  svg.select('.x.axis').call(xAxis);

  svg.selectAll('.x.axis .tick line')
    .attr('y2', y.range()[1]);

  document.querySelector('.profits').innerHTML = '';
  const rects = svg.select('.profits').selectAll('rect').data(_transactions);

  rects.enter()
    .append('rect')
    .attr('fill', t => t.profit > 0 ? 'lightgrey' : 'darkgrey')
    .attr('y', t => y(Math.max(t.profit, 0)))
    .attr('x', (t, i) => x(i))
    .attr('height', t => y(Math.min(t.profit, 0)) - y(Math.max(t.profit, 0)))
    .attr('width', x.bandwidth)
    .append('title').text(t => `${t.buy.Date}\n\tto\n${t.sell.Date}`);
}

const parseQuotes = ({ Date, Volume, ...rest }) => {
  _.forEach(rest, (v, k) => rest[k] = _.round(+v));
  return { Date, Time: new window.Date(Date), ...rest };
}

const calculatePositionSize = (capital, risk, price) => {

}
const detectTransactions = () => {
  const tolerance = readTolerance();
  const accumulateTrades = (transactions, q) => {
    const t = _.last(transactions);
    const isLong = t && t.buy && !t.sell;
    const goLong = q.Close > (q.sma1 + tolerance);
    const goShort = q.Close < (q.sma1 - tolerance);
    if (goLong && !isLong) transactions.push({ buy: q });
    if (goShort && isLong) t.sell = q;
    return transactions;
  };
  _transactions = _.reduce(_.filter(_allQuotes, 'sma1'), accumulateTrades, []);
  const t = _.last(_transactions);
  if (!t.sell) t.sell = _.last(_allQuotes);
  _.forEach(_transactions, t => t.profit = (t.sell.Close - t.buy.Close));
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
  const worst_loss = -_.round(_.get(_.minBy(lossList, 'profit'), 'profit', 0));
  const best_win = _.round(_.get(_.maxBy(winList, 'profit'), 'profit', 0));
  _summary = { total_profit, played, expectency, wins, losses, win_percent, average_win_size, average_loss_size, win_loss_multiple, worst_loss, best_win };
}
const smas = 'sma1,sma2,sma3'.split(',');

const updateSMA = name => {
  const period = readControl(name);
  _.forEach(_allQuotes, q => delete q[name]);
  if (!period) return;
  let sum = 0;
  _.forEach(_allQuotes, (q, i) => {
    const pStart = i - period;
    sum += q.Close;
    if (pStart >= 0) sum -= _allQuotes[pStart].Close;
    if (pStart > 0) q[name] = _.round(sum / period);
  })
}
const analyze = () => {
  _.forEach(smas, updateSMA);
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

  summaryTr.append('th').text(k => k.replace(/_/g, ' '));
  summaryTr.append('td').text(k => _summary[k]);

}
const recalculateAndDraw = () => {
  analyze();
  updateTransactionsSummary();
  updateOutcomes();

  updateChart();
}
const startVisualization = (quotes) => {
  initChart();
  initOutComes();
  _allQuotes = quotes;
  initControls();
  recalculateAndDraw();
}
const main = () => {
  d3.csv('data/nifty.csv', parseQuotes).then(startVisualization);
}
window.onload = main;