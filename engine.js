const light = normalize(toPoint3d(0, 0, 1));

const displaySurface = toPoint3d(0, 0, 1);

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

const rotation = {
    ay: 0,
    ax: 0
}

const canvas = {
    width: 150,
    height: 150,
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

function substract(point3d_1, point3d_2) {
    return {
        x: point3d_1.x - point3d_2.x,
        y: point3d_1.y - point3d_2.y,
        z: point3d_1.z - point3d_2.z
    };
}

function multiply(point3d, factor) {
    return {
        x: point3d.x * factor,
        y: point3d.y * factor,
        z: point3d.z * factor
    };
}

function add(point3d_1, point3d_2) {
    return {
        x: point3d_1.x + point3d_2.x,
        y: point3d_1.y + point3d_2.y,
        z: point3d_1.z + point3d_2.z
    };
}

function dotProduct(point3d_1, point3d_2) {
    const result = point3d_1.x * point3d_2.x + point3d_1.y * point3d_2.y + point3d_1.z * point3d_2.z;
    return result;
}

// https://github.com/OneLoneCoder/videos/blob/master/OneLoneCoder_olcEngine3D_Part3.cpp
function intersectPlane(plane, lineStartPoint3d, lineEndPoint3d) {
    let {planePoint, planeNormal} = plane;

    // just to be sure - reconsider this later!
    planeNormal = normalize(planeNormal);

    // dotProduct with normal is vector length when projected to normal
    const planeDot = dotProduct(planeNormal, planePoint);
    const ad = dotProduct(lineStartPoint3d, planeNormal);
    const bd = dotProduct(lineEndPoint3d, planeNormal);
    const t = (planeDot - ad) / (bd - ad);
    const lineStartToEnd = substract(lineEndPoint3d, lineStartPoint3d);
    const lineToIntersect = multiply(lineStartToEnd, t);
    const result = add(lineStartPoint3d, lineToIntersect);

    return result;
}

function clip(plane, triple) {
    const result = [];
    const insidePoints = [];
    const outsidePoints = [];

    plane = { 
        planeNormal: normalize(plane.planeNormal),
        planePoint: plane.planePoint
    }

    const { planeNormal, planePoint } = plane;

    const distance = (point3d) => {
        // dotProduct with normal: length of vector when projected to normal
        const result = dotProduct(point3d, planeNormal) - dotProduct(planePoint, planeNormal);

        return result;
    };

    const categorize = (point3d) => {
        const dist = distance(point3d);
        if (dist >= 0) {
            insidePoints.push(point3d);
        }
        else {
            outsidePoints.push(point3d);
        }
    };

    triple.forEach(p => categorize(p));


    if (insidePoints.length === 0) {
        return [];
    }

    if (insidePoints.length === 3) {
        return [triple];
    }

    if (insidePoints.length === 1) {
        let a =             [
            insidePoints[0],
            intersectPlane(plane, insidePoints[0], outsidePoints[0]),
            intersectPlane(plane, insidePoints[0], outsidePoints[1]),
        ];


        a.color = triple.color;

        return [a];
    }

    if (insidePoints.length === 2) {
        let a = [
            insidePoints[0],
            insidePoints[1],
            intersectPlane(plane, insidePoints[0], outsidePoints[0])
        ];

        let b = [
            insidePoints[1],
            a[2],
            intersectPlane(plane, insidePoints[1], outsidePoints[0]),
        ];

        a.color = triple.color;
        b.color = triple.color;

        return [a, b];
    }

}

// https://github.com/OneLoneCoder/videos/blob/master/OneLoneCoder_olcEngine3D_Part2.cpp
function crossProduct(point3d_1, point3d_2, point3d_3) {
    const line1 = substract(point3d_2, point3d_1);
    const line2 = substract(point3d_3, point3d_1);

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

let objType;
let minZ;

function load(parsedFile, type, x, y) {
    coords = parsedFile.coords;
    areas = parsedFile.areas;

    const max = Math.max( ...[...coords.map(c => c.x), ...coords.map(c => c.y), ...coords.map(c => c.z)] );
    recommentedDistance = max + 4;
    camera.z = recommentedDistance;

    minZ = Math.min(...coords.map(c => c.z));

    if (y) {
        camera.y = y;
    }
    else {
        camera.y = 0;
    }

    if (x) {
        camera.x = x;

    }
    else {
        camera.x = 0;
    }

    rotation.ax = 0;
    rotation.ay = 0;
    objType = type;

    stopAnimation();
    render();
    startAnimation();
}

function loadCube() {
    load({coords: coordsCube, areas: areasCube});
}

// https://en.wikipedia.org/wiki/3D_projection
function project(point3d) {
    const x = point3d.x - camera.x;
    const y = point3d.y - camera.y;
    const z = point3d.z - camera.z;

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

function project3d(point3d) {
    const x = point3d.x - camera.x;
    const y = point3d.y - camera.y;
    const z = point3d.z - camera.z;

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

    return { x: dx, y: dy, z: dz };
}

function projected3dTo2d(point3d) {
    const ex = displaySurface.x;
    const ey = displaySurface.y;
    const ez = displaySurface.z;
    const dx = point3d.x;
    const dy = point3d.y;
    const dz = point3d.z;

    return {
        x: (ez/dz) * dx + ex,
        y: (ez/dz) * dy + ey
    };
}

function toCanvasPoint(point2d) {
    const x = Math.round(point2d.x * canvas.width + canvas.width /*+  canvas.border*/); 
    const y = Math.round(point2d.y * canvas.height + canvas.height /*+  canvas.border*/); 
    return { x, y, z:0 };
}

function calcColor(point1, point2, point3) {
    const cross = normalize(crossProduct(point1, point2, point3));

    // cosine similarity b/w two normals
    const cosineSimilarity = cross.x * light.x + cross.y * light.y + cross.z * light.z;
    
    // it doen't become blacker ...
    let intensity = Math.max(0, cosineSimilarity);
  
    const code = Math.floor(intensity * 255);
    const rgba =  `rgba(0, ${code/2}, ${code}, 255)`;

    return rgba;
}

function clearCanvas() {
    ctx.clearRect(0, 0, 300, 300);
}

const ctx = document.getElementById('canvas').getContext('2d');

function drawTriangle(p1_2d, p2_2d, p3_2d, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(p1_2d.x, p1_2d.y);
    ctx.lineTo(p2_2d.x, p2_2d.y);
    ctx.lineTo(p3_2d.x, p3_2d.y);
    ctx.closePath();
    ctx.fill();
}

function isVisible(triple) {
    const point1 = triple[0];
    const point2 = triple[1];
    const point3 = triple[2];

    const normal = normalize(crossProduct(point1, point2, point3));

    const x = point1.x;
    const y = point1.y;
    const z = point1.z;
    
    // Compare normal with vector -- < 0 --> < 90° 
    return (normal.x * x + normal.y * y + normal.z * z) < 0;
}

function transform(coord) {
    coord = rotateY(coord, rotation.ay);
    coord = rotateX(coord, rotation.ax)
    return coord;    
}

function clip2d(triple) {
    let triples = [triple];

    const leftPlane = {
        planePoint: toPoint3d(0.0, 0.0, 0.0),
        planeNormal: toPoint3d(0.0, 1.0, 0.0),
    };

    const rightPlane = {
        planePoint: toPoint3d(0.0, 300-1, 0.0),
        planeNormal: toPoint3d(0.0, -1.0, 0.0),
    };

    const topPlane = {
        planePoint: toPoint3d(0.0, 0.0, 0.0),
        planeNormal: toPoint3d(1.0, 0.0, 0.0),
    };

    const bottomPlane = {
        planePoint: toPoint3d(300-1, 0.0, 0.0),
        planeNormal: toPoint3d(-1.0, 0.0, 0.0),
    };   

    triples = triples.flatMap(triple => clip(topPlane, triple));
    triples = triples.flatMap(triple => clip(bottomPlane, triple));
    triples = triples.flatMap(triple => clip(leftPlane, triple));
    triples = triples.flatMap(triple => clip(rightPlane, triple));
    return triples;

};

function render() {
    clearCanvas();

    const triples = areas.map(area => ([
        coords[area[0]-1],
        coords[area[1]-1],
        coords[area[2]-1]
    ]));
    
    const screenPlane = {
        planePoint: toPoint3d(0, 0, -1.0),
        planeNormal: toPoint3d(0, 0, -1),
    };

    const projTriples = triples.flatMap(triple => {
        const p1 = transform(triple[0]);
        const p2 = transform(triple[1]);
        const p3 = transform(triple[2]);

        const p1_p = project3d(p1);
        const p2_p = project3d(p2);
        const p3_p = project3d(p3);

        let projected = [p1_p, p2_p, p3_p];

        if (isVisible(projected)) {
            return clip(screenPlane, projected);
        }
        return [];
    });

    const sorted = projTriples.sort((t1, t2) => {
        const z1 = (t1[0].z + t1[1].z + t1[2].z);
        const z2 = (t2[0].z + t2[1].z + t2[2].z);
        return z1 - z2;
    });
   
    sorted.forEach(triple => {
        const color = calcColor(triple[0], triple[1], triple[2]); 

        const p1 = projected3dTo2d(triple[0]);
        const p2 = projected3dTo2d(triple[1]);
        const p3 = projected3dTo2d(triple[2]);

        const c1 = toCanvasPoint(p1);
        const c2 = toCanvasPoint(p2);
        const c3 = toCanvasPoint(p3);

        let triple2d = [c1,c2,c3];
        triple2d.color = color;

        clip2d(triple2d).forEach(triple => {
            drawTriangle(triple[0], triple[1], triple[2], triple.color);
        });
    });
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
    if (!objType || objType === 'obj') {
        animateObj();
    }
    else {
        animateLandscape();
    }
}

function animateObj() {
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



function animateLandscape() {
    if (!animationStarted) return;
    if (camera.z <= minZ + 30) return;

    const now = Date.now();
    const elapsed = (now - time)/1000;

    if (elapsed > 1/66) {
        camera.z -= 0.2;
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
      
        case 'a':
            camera.oy -= Math.PI / 180 *2;
            break;
        case 'd':
            camera.oy += Math.PI / 180 *2;
            break;
        case 'w':
            camera.z -= 0.4;
            break;
        case 's':
            camera.z += 0.4;
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




