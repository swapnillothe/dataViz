const chartSize = { width: 800, height: 600 };
const margin = { left: 100, right: 10, top: 20, bottom: 150 };
const width = chartSize.width - margin.left - margin.right;
const height = chartSize.height - margin.top - margin.bottom;
const formats = { 
  Rs:d=>`${d} ₹`,
  kCrRs:d=>`${d/1000}k Cr ₹`,
  Percent:d=>`${d}%`
};
const configs = [['CMP',formats.Rs],['MarketCap',formats.kCrRs],['PE'],['DivYld',formats.Percent],['ROCE',formats.Percent]];
const updateChart = (companies, step=0) => {
  const [fieldName,format] = configs[step%configs.length];
  
  const svg = d3.select('#chart-area svg');

  const y = d3.scaleLinear()
    .domain([0, _.maxBy(companies, fieldName)[fieldName]])
    .range([height, 0]);

  svg.select('.y.axis-label').text(fieldName);

  const yAxis = d3.axisLeft(y)
    .ticks(10)
    .tickFormat(format);

  svg.select('.y.axis').call(yAxis);
  
  svg.selectAll('g rect').data(companies)
    .transition().duration(2000).ease(d3.easeLinear)
    .attr('height', b => y(0) - y(b[fieldName]))
    .attr('y', b => y(b[fieldName]))
}
const initChart = (companies) => {
  const svg = d3.select('#chart-area svg')
    .attr('height', chartSize.height)
    .attr('width', chartSize.width);

  const x = d3.scaleBand()
    .domain(_.map(companies, 'Name'))
    .range([0, width])
    .padding(0.3);

  const color = d3.scaleOrdinal(d3.schemeCategory10);
  const xAxis = d3.axisBottom(x);  

  const g = svg.append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  g.append('text')
    .attr('class', 'x axis-label')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - margin.top)
    .text('Companies');

  g.append('text')
    .attr('class', 'y axis-label')
    .attr('x', -(height / 2))
    .attr('y', -60);

  g.append('g')
    .attr('class', 'x axis')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);

  g.append('g')
    .attr('class', 'y axis');

  const rects = g.selectAll('rect').data(companies);
  const newRects = rects.enter();
  newRects.append('rect')
    .attr('x', b => x(b.Name))
    .attr('y', height)    
    .attr('width', x.bandwidth)    
    .attr('fill', b => color(b.Name));
  updateChart(companies);
};

const parseCompany = ({ Name, ...rest }) => {
  _.forEach(rest, (v, k) => rest[k] = +v);
  return { Name, ...rest };
}
const startVisualization = (companies) => {
  let step = 1;
  initChart(companies);
  setInterval(() => updateChart(companies, step++), 3000);
}
const main = () => {
  d3.csv('data/companies.csv', parseCompany).then(startVisualization);
}
window.onload = main;