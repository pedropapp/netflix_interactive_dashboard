function createBarChart(data, selector, xLabel, yLabel) {
    const margin = { top: 20, right: 20, bottom: 70, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(selector).selectAll("*").remove();

    const svg = d3.select(selector).append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .range([0, width])
        .domain(data.map(d => d[0]))
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[1])])
        .range([height, 0]);

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll('text')
        .attr('transform', 'translate(-10,0)rotate(-45)')
        .style('text-anchor', 'end');

    svg.append('g')
        .call(d3.axisLeft(y));

    svg.selectAll('mybar')
        .data(data)
        .enter()
        .append('rect')
        .attr('x', d => x(d[0]))
        .attr('y', d => y(d[1]))
        .attr('width', x.bandwidth())
        .attr('height', d => height - y(d[1]))
        .attr('fill', '#E50914');

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .text(xLabel);

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .attr('text-anchor', 'middle')
        .text(yLabel);
}

function createLineChart(data, selector, xLabel, yLabel) {
    const margin = { top: 20, right: 20, bottom: 30, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(selector).selectAll("*").remove();

    const svg = d3.select(selector).append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d[0]))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d[1])])
        .range([height, 0]);

    const line = d3.line()
        .x(d => x(d[0]))
        .y(d => y(d[1]));

    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(24));

    svg.append('g')
        .call(d3.axisLeft(y));

    svg.append('path')
        .datum(data)
        .attr('fill', 'none')
        .attr('stroke', '#E50914')
        .attr('stroke-width', 2)
        .attr('d', line);

    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + margin.bottom)
        .attr('text-anchor', 'middle')
        .text(xLabel);

    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 0 - margin.left)
        .attr('x', 0 - (height / 2))
        .attr('dy', '1em')
        .attr('text-anchor', 'middle')
        .text(yLabel);
}
function createPieChart(data, selector, label) {
    const width = 450;
    const height = 450;
    const margin = 40;

    const radius = Math.min(width, height) / 2 - margin;

    // Clear the content of the selected container
    d3.select(selector).selectAll("*").remove();

    // Create the SVG container
    const svg = d3.select(selector)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    // Set the color scale with shades of red and black
    const color = d3.scaleOrdinal()
        .domain(data.map(d => d[0]))
        .range(["#E50914", "#A6000F", "#80000B", "#500008", "#2B0005"]); // Customize these colors

    // Compute the position of each slice
    const pie = d3.pie()
        .value(d => d[1]);

    // Generate the arcs
    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    // Bind data to the slices
    const slices = svg.selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data[0]))
        .attr("stroke", "#000")
        .style("stroke-width", "1px");

    // Add labels
    svg.selectAll("text")
        .data(pie(data))
        .enter()
        .append("text")
        .text(d => `${d.data[0]}: ${d.data[1].toFixed(2)} hours`)
        .attr("transform", d => `translate(${arc.centroid(d)})`)
        .style("text-anchor", "start")
        .style("font-size", "12px")
        .style("fill", "#FFF");
}
function createWorldMap(data, selector, countryField, valueField) {
    const width = 960;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const extractCountryName = (str) => {
        const match = str.match(/\(([^)]+)\)/);
        return match ? match[1] : str;
    };

    d3.select(selector).selectAll("*").remove();

    const container = d3.select(selector)
        .append("div")
        .style("position", "relative");

    const svg = container
        .append("svg")
        .attr("viewBox", [0, 0, width, height])
        .attr("width", width)
        .attr("height", height)
        .style("max-width", "100%")
        .style("height", "auto");

    const g = svg.append("g");

    const projection = d3.geoNaturalEarth1()
        .scale(140)
        .translate([width / 2, height / 1.4]);

    const path = d3.geoPath().projection(projection);

    const colorScale = d3.scaleLog()
        .domain([1, d3.max(data, d => d[1])])
        .range(["#300", "#f00"]);

    function clicked(event, d) {
        const countryData = data.find(item => extractCountryName(item[0]) === d.properties.name);
        if (!countryData) return; // Don't zoom if there's no data for this country

        const [[x0, y0], [x1, y1]] = path.bounds(d);
        event.stopPropagation();

        const k = Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height));
        const centroid = [(x0 + x1) / 2, (y0 + y1) / 2];

        g.transition()
            .duration(750)
            .attr("transform", `translate(${width / 2}, ${height / 2})scale(${k})translate(${-centroid[0]}, ${-centroid[1]})`)
            .attr("stroke-width", 1 / k);

        showCountryDetails(d);
    }

    function reset() {
        g.transition()
            .duration(750)
            .attr("transform", "translate(0,0)scale(1)")
            .attr("stroke-width", 1);
        hideCountryDetails();
    }

    function showCountryDetails(d) {
        hideCountryDetails(); // Remove any existing details
        const countryData = data.find(item => extractCountryName(item[0]) === d.properties.name);
        if (countryData) {
            const detailsDiv = container.append("div")
                .attr("class", "country-details")
                .style("position", "absolute")
                .style("top", "10px")
                .style("left", "10px")
                .style("padding", "10px")
                .style("border-radius", "5px")
                .style("z-index", "1000");

            detailsDiv.html(`
                <h3>${d.properties.name}</h3>
                <p>Total Hours Watched: ${countryData[1].toFixed(2)} hours</p>
                <!-- Add more details here based on your data structure -->
            `);
        }
    }

    function hideCountryDetails() {
        container.select(".country-details").remove();
    }

    d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then((world) => {
        const countries = topojson.feature(world, world.objects.countries);
        const countrymesh = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);

        g.selectAll("path")
            .data(countries.features)
            .enter().append("path")
            .attr("d", path)
            .attr("fill", d => {
                const countryData = data.find(item => extractCountryName(item[0]) === d.properties.name);
                return countryData ? colorScale(countryData[1]) : "#222";
            })
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .on("click", clicked);

        g.append("path")
            .datum(countrymesh)
            .attr("fill", "none")
            .attr("stroke", "#fff")
            .attr("stroke-width", 0.5)
            .attr("d", path);

        svg.on("click", reset);

    }).catch(error => console.error("Error loading data:", error));
}