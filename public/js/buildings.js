const showData = (buildings) => {
  const toLine = b => `<strong>${b.name}</strong> <i>${b.height}</i>`;
  document.querySelector('#chart-data').innerHTML = buildings.map(toLine).join('<hr/>');
}
const drawChart = (buildings) => {
  const [width, height] = [400, 400];
  const svg = d3.select('#chart-area').append('svg')
    .attr('height', height)
    .attr('width', width);

  const y = d3.scaleLinear()
    .domain([0, _.maxBy(buildings, 'height').height])
    .range([0, height]);

  const x = d3.scaleBand()
    .domain(_.map(buildings, 'name'))
    .range([0, width])
    .padding(0.3);

  const rects = svg.selectAll('rect').data(buildings);
  const newRects = rects.enter();
  newRects.append('rect')
    .attr('x', b => x(b.name))
    .attr('y', 0)
    .attr('width', x.bandwidth)
    .attr('height', b => y(b.height))
    .attr('fill', 'grey');
}
const drawBuildings = (buildings) => {
  showData(buildings);
  drawChart(buildings);
}
const main = () => {
  d3.json('data/buildings.json').then(drawBuildings);
}
window.onload = main;