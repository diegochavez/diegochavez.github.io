import Inferno from 'inferno';
import Component from 'inferno-component';
import { interpolateViridis } from 'd3';
import tracked from 'tracked';
import './style.css';

function map(arr, to) {
	let out = [];
	for (let i=arr.length; i--; ) out[i] = to(arr[i]);
	return out;
}

class Demo extends Component {

    @tracked numPoints = 0;

	updateCount = e => {
        //console.log(e.target.value);
		this.numPoints = e.target.value;
	};

	componentDidMount(){
		setTimeout(()=>this.numPoints = 1000)
	}

	render() {
		return (
			<div class="app-wrapper">
				<VizDemo count={this.numPoints} />
				<div class="controls">
					# Points
					<input type="range" min={10} max={10000} value={this.numPoints} onInput={this.updateCount} />
					{this.numPoints}
				</div>
				<div class="about">
                    InfernoJs Demo by <a href="https://github.com/diegochavez" target="_blank">Diego Chavez</a> Fork from 
					Demo by <a href="https://github.com/developit" target="_blank">Jason Miller</a>,
					based on the Glimmer demo by <a href="http://mlange.io" target="_blank">Michael Lange</a>.
				</div>
			</div>
		);
	}
}



const Layout = {
	PHYLLOTAXIS: 0,
	GRID: 1,
	WAVE: 2,
	SPIRAL: 3
};

const LAYOUT_ORDER = [
	Layout.PHYLLOTAXIS,
	Layout.SPIRAL,
	Layout.PHYLLOTAXIS,
	Layout.GRID,
	Layout.WAVE
];

class VizDemo extends Component {

	@tracked layout = 0;
	@tracked count = 0;
	@tracked phyllotaxis = genPhyllotaxis(100);
	@tracked grid = genGrid(100);
	@tracked wave = genWave(100);
	@tracked spiral = genSpiral(100);

	@tracked points = [];

	@tracked step = 0;
	@tracked numSteps = 60 * 2;

	next() {
		this.step = (this.step + 1) % this.numSteps;

		if (this.step === 0) {
			this.layout = (this.layout + 1) % LAYOUT_ORDER.length;
		}

		// Clamp the linear interpolation at 80% for a pause at each finished layout state
		const pct = Math.min(1, this.step / (this.numSteps * 0.8));

		const currentLayout = LAYOUT_ORDER[this.layout];
		const nextLayout = LAYOUT_ORDER[(this.layout + 1) % LAYOUT_ORDER.length];

		// Keep these redundant computations out of the loop
		const pxProp = xForLayout(currentLayout);
		const nxProp = xForLayout(nextLayout);
		const pyProp = yForLayout(currentLayout);
		const nyProp = yForLayout(nextLayout);

		this.points = this.points.map(point => {
			const newPoint = { ...point};
			newPoint.x = lerp(newPoint, pct, pxProp, nxProp);
			newPoint.y = lerp(newPoint, pct, pyProp, nyProp);
			return newPoint;
		});

		requestAnimationFrame(() => { this.next() });
	}



	setAnchors(arr) {
		arr.map((p, index) => {
			const [ gx, gy ] = project(this.grid(index));
			const [ wx, wy ] = project(this.wave(index));
			const [ sx, sy ] = project(this.spiral(index));
			const [ px, py ] = project(this.phyllotaxis(index));

			Object.assign(p, { gx, gy, wx, wy, sx, sy, px, py });
		
		});

		this.points = arr;
	}


	makePoints() {
		const newPoints = [];
		for (var i = 0; i < this.count; i++) {
			newPoints.push({
				x: 0,
				y: 0,
				color: interpolateViridis(i / this.count),
			});
		}
		this.setAnchors(newPoints);
	}



	componentWillReceiveProps(props) {
		if (props.count !== this.count) {
			this.count = props.count;

			this.phyllotaxis = genPhyllotaxis(this.count);
			this.grid = genGrid(this.count);
			this.wave = genWave(this.count);
			this.spiral = genSpiral(this.count);
		

			this.makePoints();
		
		}
	}

	componentDidMount() {
		this.next();
	}

	renderPoint(point) {
		return <Point {...point} />
	}

	render() {
		return (
			<svg class="demo">
				<g noNormalize hasNonKeyedChildren>
					{ map(this.points, this.renderPoint) }
				</g>
			</svg>
		);
	} 
}


function Point({ x, y, color }) {
	if(parseInt(x) && parseInt(y)){
	return (
		<rect
			class="point"
			transform={`translate(${x}, ${y})`}
			fill={color}
			noNormalize
		/>
	);
	}

}
const theta = Math.PI * (3 - Math.sqrt(5));

function xForLayout(layout) {
	switch (layout) {
		case Layout.PHYLLOTAXIS:
			return 'px';
		case Layout.GRID:
			return 'gx';
		case Layout.WAVE:
			return 'wx';
		case Layout.SPIRAL:
			return 'sx';
	}
}

function yForLayout(layout) {
	switch (layout) {
		case Layout.PHYLLOTAXIS:
			return 'py';
		case Layout.GRID:
			return 'gy';
		case Layout.WAVE:
			return 'wy';
		case Layout.SPIRAL:
			return 'sy';
	}
}

function lerp(obj, percent, startProp, endProp) {
	let px = obj[startProp];
	return px + (obj[endProp] - px) * percent;
}

function genPhyllotaxis(n) {
	return i => {
		let r = Math.sqrt(i / n);
		let th = i * theta;
		return [r * Math.cos(th), r * Math.sin(th)];
	};
}

function genGrid(n) {
	let rowLength = Math.round(Math.sqrt(n));
	return i => [
		-0.8 + 1.6 / rowLength * (i % rowLength),
		-0.8 + 1.6 / rowLength * Math.floor(i / rowLength),
	];
}

function genWave(n) {
	let xScale = 2 / (n - 1);
	return i => {
		let x = -1 + i * xScale;
		return [x, Math.sin(x * Math.PI * 3) * 0.3];
	};
}

function genSpiral(n) {
	return i => {
		let t = Math.sqrt(i / (n - 1)),
			phi = t * Math.PI * 10;
		return [t * Math.cos(phi), t * Math.sin(phi)];
	};
}

function scale(magnitude, vector) {
	return vector.map(p => p * magnitude);
}

function translate(translation, vector) {
	return vector.map((p, i) => p + translation[i]);
}

function project(vector) {
	const wh = window.innerHeight / 2;
	const ww = window.innerWidth / 2;
	return translate([ ww, wh ], scale(Math.min(wh, ww), vector));
}


Inferno.render(<Demo />, document.getElementById('app'));