const dimensions = {
  height: 300,
  width: 300,
  radius: 150,
}
const center = {
  x: dimensions.width / 2 + 5,
  y: dimensions.height / 2 + 15,
}

const svg = d3
  .select('.canvas')
  .append('svg')
  .attr('width', dimensions.width + 150)
  .attr('height', dimensions.height + 50)

const graph = svg
  .append('g')
  .attr('transform', `translate(${center.x}, ${center.y})`)
// translates graph group to middle of svg container

const pie = d3
  .pie()
  .sort(null)
  .value((d) => d.cost)

// arc generator needs to know the start and end angles
// outerRadius() accepts param to let it know how deep slice should be
// innerRadius() accepts param to let it know where the inside of pie chart should be
const arcPath = d3
  .arc()
  .outerRadius(dimensions.radius)
  .innerRadius(dimensions.radius / 2)

const colorScale = d3.scaleOrdinal(d3['schemeSet3'])

// legend setup
const legendGroup = svg
  .append('g')
  .attr('transform', `translate(${dimensions.width + 10}, 10)`)

const legend = d3
  .legendColor()
  .shape('circle')
  .shapePadding(5)
  .scale(colorScale)

// tooltip setup
const tooltip = d3.select('#tooltip')
let tipHeight
// update function
const update = (data) => {
  // update color scale domain
  colorScale.domain(data.map((d) => d.name))
  // update and call legend
  legendGroup.call(legend)
  legendGroup.selectAll('text').attr('fill', '#243642')

  // join enhanced (pie) data to path elements
  const paths = graph.selectAll('path').data(pie(data))

  // remove exit selection
  paths.exit().transition().duration(1000).attrTween('d', arcTweenExit).remove()

  // update current shapes in DOM
  paths
    .attr('d', arcPath)
    .transition()
    .duration(1000)
    .attrTween('d', arcTweenUpdate)

  paths
    .enter()
    .append('path')
    .attr('class', 'arc')
    .attr('d', arcPath)
    .attr('stroke', '#243642')
    .attr('stroke-width', '3px')
    .attr('fill', (d) => colorScale(d.data.name))
    .each(function (d) {
      this._current = d
    })
    .transition()
    .duration(1000)
    .attrTween('d', arcTweenEnter)

  // add events
  graph
    .selectAll('path')
    .on('mouseover', (e, d) => {
      handleMouseOver(e, d)
      tooltip.style('opacity', 1)
      // attach data
      tooltip.select('#name').text(d.data.name)
      tooltip.select('#cost').text(d.data.cost)
      let tip = document.getElementById('tooltip')
      tipHeight = tip.offsetHeight + 15
    })
    .on('mouseout', (e, d) => {
      handleMouseOut(e, d)
      tooltip.style('opacity', 0)
    })
    .on('mousemove', (e, d) => {
      tooltip
        .style('transform', `translate(-50%, 0)`)
        .style('left', e.pageX + 'px')
        .style('top', e.pageY - tipHeight + 'px')
    })
    .on('click', handleClick)
}

let data = []
db.collection('groceries').onSnapshot((res) => {
  res.docChanges().forEach((ch) => {
    const doc = { ...ch.doc.data(), id: ch.doc.id }

    switch (ch.type) {
      case 'added':
        data.push(doc)
        break
      case 'modified':
        const index = data.findIndex((it) => it.id === doc.id)
        data[index] = doc
        break
      case 'removed':
        data = data.filter((it) => it.id !== doc.id)
        break
      default:
        break
    }
  })

  update(data)
})

const arcTweenEnter = (d) => {
  let i = d3.interpolate(d.endAngle, d.startAngle)

  return function (t) {
    d.startAngle = i(t)
    return arcPath(d)
  }
}

const arcTweenExit = (d) => {
  let i = d3.interpolate(d.startAngle, d.endAngle)

  return function (t) {
    d.startAngle = i(t)
    return arcPath(d)
  }
}

// use fn keyword to allow use of 'this'
function arcTweenUpdate(d) {
  // interpolate between the two objects
  let i = d3.interpolate(this._current, d)
  // update current prop with new updated data
  this._current = i(1)

  return function (t) {
    return arcPath(i(t))
  }
}

// event handlers
function handleMouseOver(e, d) {
  d3.select(e.target)
    .transition('changeSliceFill')
    .duration(400)
    .attr('fill', '#243642')
}

function handleMouseOut(e, d) {
  d3.select(e.target)
    .transition('changeSliceFill') // naming transition prevents transitions from interfering with each other
    .duration(400)
    .attr('fill', colorScale(d.data.name))
}

function handleClick(e, d) {
  const id = d.data.id
  db.collection('groceries').doc(id).delete()
}
