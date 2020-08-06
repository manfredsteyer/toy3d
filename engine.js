const light = normalize(toPoint3d(0, 0, 1));

const displaySurface = toPoint3d(0, 0, 0.5);

const camera = {
    x: 0, 
    y: 0, 
    z: 30,
    ox: 0,
    oy: 0,
    oz: 0
}

const coordsCube = [
    toPoint3d(1, -1, -1),
    toPoint3d(1, -1, 1),
    toPoint3d(-1, -1, 1),
    toPoint3d(-1, -1, -1),
    toPoint3d(1, 1, -1),
    toPoint3d(1, 1, 1),
    toPoint3d(-1, 1, 1),
    toPoint3d(-1, 1, -1)
];

const areasCube = [
    [2,3,4],
    [8,7,6],
    [5,6,2],
    [6,7,3],
    [3,7,8],
    [1,4,8],
    [1,2,4],
    [5,8,6],
    [1,5,2],
    [2,6,3],
    [4,3,8],
    [5,1,8]
];

// const coordsCube = [
//     toPoint3d(1, 1, 5),
//     toPoint3d(4, 1, 5),
//     toPoint3d(3, 4, 5),
// ];

// const areasCube = [
//    [1,2,3]
// ];


const rotation = {
    ay: 0,
    ax: 0
}

const canvas = {
    width: 150,
    height: 150,
    border: 25
}

let coords;
let areas;
let recommentedDistance;
let coords3dTransformed;
let animationStarted = false;

function toPoint3d(x, y, z) {
    return { x, y, z }
}

// https://de.wikipedia.org/wiki/Drehmatrix
function rotateX(point3d, alpha) {
    const sina = Math.sin(alpha);
    const cosa = Math.cos(alpha);

    const x = point3d.x;
    const y = point3d.y * cosa - point3d.z * sina;
    const z = point3d.y * sina + point3d.z * cosa;

    return { x, y, z }; 
}

function rotateY(point3d, alpha) {
    const sina = Math.sin(alpha);
    const cosa = Math.cos(alpha);

    const x = point3d.x * cosa + point3d.z * sina;
    const y = point3d.y;
    const z = point3d.x * -sina + point3d.z * cosa; 

    return { x, y, z }; 
}

// https://github.com/OneLoneCoder/videos/blob/master/OneLoneCoder_olcEngine3D_Part2.cpp
function crossProduct(point3d_1, point3d_2, point3d_3) {
    const line1 = {
        x: point3d_2.x - point3d_1.x,
        y: point3d_2.y - point3d_1.y,
        z: point3d_2.z - point3d_1.z,
    };

    const line2 = {
        x: point3d_3.x - point3d_1.x,
        y: point3d_3.y - point3d_1.y,
        z: point3d_3.z - point3d_1.z,
    };

    const result = {
        x: line1.y * line2.z - line1.z * line2.y,
        y: line1.z * line2.x - line1.x * line2.z,
        z: line1.x * line2.y - line1.y * line2.x,
    }

    return result;
}

function normalize(point3d) {
    const length = Math.sqrt(point3d.x*point3d.x + point3d.y*point3d.y + point3d.z*point3d.z);
    
    const result = {
        x: point3d.x / length,
        y: point3d.y / length,
        z: point3d.z / length
    }

    return result;
}

function load(parsedFile, animate) {
    coords = parsedFile.coords;
    areas = parsedFile.areas;

    const max = Math.min( ...[...coords.map(c => c.x), ...coords.map(c => c.y), ...coords.map(c => c.z)] );
    recommentedDistance = max - 2;
    camera.z = recommentedDistance;
    rotation.ax = 0;
    rotation.ay = 0;

    stopAnimation();
    render();

    if (animate) {
        startAnimation();
    }
}

function loadCube() {
    load({coords: coordsCube, areas: areasCube});
}

// https://en.wikipedia.org/wiki/3D_projection
function project(point3d) {
    const x = point3d.x - camera.x *-1;
    const y = point3d.y - camera.y;
    const z = point3d.z - camera.z *-1;

    const ex = displaySurface.x;
    const ey = displaySurface.y;
    const ez = displaySurface.z;

    const sx = Math.sin(camera.ox);
    const sy = Math.sin(camera.oy);
    const sz = Math.sin(camera.oz);

    const cx = Math.cos(camera.ox);
    const cy = Math.cos(camera.oy);
    const cz = Math.cos(camera.oz);

    const dx = cy * (sz*y+cz*x) - sy*z;
    const dy = sx * (cy*z+sy*(sz*y+cz*x)) + cx * (cz*y-sz*x);
    let dz = cx * (cy*z+sy*(sz*y+cz*x)) - sx * (cz*y-sz*x);

    const bx = (ez/dz) * dx + ex;
    const by = (ez/dz) * dy + ey;

    return { x: bx, y: by };
}

function toCanvasPoint(point2d) {
    const x = Math.round(point2d.x * canvas.width + canvas.width /*+  canvas.border*/); 
    const y = Math.round(point2d.y * canvas.height + canvas.height /*+  canvas.border*/); 
    return { x, y };
}

function calcColor(area) {
    const point1 = coords3dTransformed[area[0]-1];
    const point2 = coords3dTransformed[area[1]-1];
    const point3 = coords3dTransformed[area[2]-1];

    const cross = normalize(crossProduct(point1, point2, point3));
    const intensity = cross.x * light.x + cross.y * light.y + cross.z * light.z;

    const code = Math.floor(intensity * 255);
    const rgba =  `rgba(0, ${code/2}, ${code}, 255)`;

    return rgba;
}

function clearCanvas() {
    ctx.clearRect(0, 0, 300, 300);
}

const ctx = document.getElementById('canvas').getContext('2d');

function render() {
    clearCanvas();

    coords3dTransformed = coords.map(coord => {
        coord = rotateY(coord, rotation.ay);
        coord = rotateX(coord, rotation.ax)
        return coord;
    }); 

    const filteredAreas = areas.filter(area => {
        const point1 = coords3dTransformed[area[0]-1];
        const point2 = coords3dTransformed[area[1]-1];
        const point3 = coords3dTransformed[area[2]-1];

        const cross = normalize(crossProduct(point1, point2, point3));

        const x = point1.x - camera.x *-1;
        const y = point1.y - camera.y;
        const z = point1.z - camera.z *-1;

        return (cross.x * x + cross.y * y + cross.z * z) < 0;
    });

    const coords2d = coords3dTransformed.map(coord => {
        const point2d = project(coord);
        return toCanvasPoint(point2d);
    });

    for (area of filteredAreas) {
        ctx.fillStyle = calcColor(area);
        ctx.beginPath();
        ctx.moveTo(coords2d[area[0]-1].x, coords2d[area[0]-1].y);
        ctx.lineTo(coords2d[area[1]-1].x, coords2d[area[1]-1].y);
        ctx.lineTo(coords2d[area[2]-1].x, coords2d[area[2]-1].y);
        ctx.closePath();
        ctx.fill();
    } 

    console.debug('camera',camera);
}

function startAnimation() {
    animationStarted = true;
    camera.z = recommentedDistance;
    animate();
}

function stopAnimation() {
    animationStarted = false;
    if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
    }
}

let time = Date.now();
let animationFrame;

function animate() {
    if (!animationStarted) return;

    const now = Date.now();
    const elapsed = (now - time)/1000;

    if (elapsed > 1/66) {
        rotation.ay += Math.PI / 180 * 2;
        render();
        time = now;
    }

    animationFrame = window.requestAnimationFrame(event => {
        animate();        
    });
}

function handleInput(key) {
    switch (key) {
        case 'ArrowLeft':
            rotation.ay += Math.PI / 180 *2;
            break;
        case 'ArrowRight':
            rotation.ay -= Math.PI / 180 *2;
            break;
        case 'ArrowUp':
            rotation.ax -= Math.PI / 180 *2;
            break;
        case 'ArrowDown':
            rotation.ax += Math.PI / 180 *2;
            break;
        case '+':
            camera.z += 0.2;
            break;
        case '-':
            camera.z -= 0.2;
            break;

            case 'a':
                camera.x -= 0.2;
                break;
            case 'd':
                camera.x += 0.2;
                break;

        case '0':
            camera.z = recommentedDistance;
            rotation.ax = 0;
            rotation.ay = 0;
            break;
        default: 
            return;
    }
    
    render();
}

document.addEventListener(
    'keydown', 
    event => handleInput(event.key));




