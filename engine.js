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
    // http://www.mathematrix.de/skalarprodukt/
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

    // TODO: Repesent triple by an object, not by an array

    // const planeNormal = normalize(plane.planeNormal);
    // const planePoint = plane.planePoint;

    plane = { 
        planeNormal: normalize(plane.planeNormal),
        planePoint: plane.planePoint
    }

    const { planeNormal, planePoint } = plane;

    const distance = (point3d) => {
        //const result3 = planeNormal.x * point3d.x + planeNormal.y * point3d.y + planeNormal.z * point3d.z - dotProduct(planeNormal, planePoint);
        
        // https://mathinsight.org/distance_point_plane#:~:text=The%20length%20of%20the%20gray,dot%20product%20v%E2%8B%85n.
        //const result = planeNormal.x * (point3d.x - planePoint.x) + planeNormal.y * (point3d.y - planePoint.y) + planeNormal.z * (point3d.z - planePoint.z);
        
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
    // const line1 = {
    //     x: point3d_2.x - point3d_1.x,
    //     y: point3d_2.y - point3d_1.y,
    //     z: point3d_2.z - point3d_1.z,
    // };

    // const line2 = {
    //     x: point3d_3.x - point3d_1.x,
    //     y: point3d_3.y - point3d_1.y,
    //     z: point3d_3.z - point3d_1.z,
    // };

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

function load(parsedFile, animate) {
    coords = parsedFile.coords;
    areas = parsedFile.areas;

    const max = Math.max( ...[...coords.map(c => c.x), ...coords.map(c => c.y), ...coords.map(c => c.z)] );
    recommentedDistance = max + 2;
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
  
    //const experiment = intensity / 2 + 0.5;
    //intensity = experiment;

    //console.assert(experiment >= 0 && experiment <= 1, experiment);
    // console.assert(!isNaN(intensity));

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

function render() {
    clearCanvas();


    const coordsTest = coords.map(coord => {
        return {
            x: -coord.x,
            y: -coord.y,
            z: -coord.z
        }
    })

    coords3dTransformed = coords.map(coord => {
        coord = rotateY(coord, rotation.ay);
        coord = rotateX(coord, rotation.ax)
        return coord;
    }); 

    const triples = areas.map(area => ([
        coords3dTransformed[area[0]-1],
        coords3dTransformed[area[1]-1],
        coords3dTransformed[area[2]-1]
    ]));

    // clippedTriples = triples;
    // clippedTriples = triples;
    // sortedTriples = clippedTriples;

    let projTriples = triples.map(triple => {
        const p1 = triple[0];
        const p2 = triple[1];
        const p3 = triple[2];

        const p1_p = project3d(triple[0]);
        const p2_p = project3d(triple[1]);
        const p3_p = project3d(triple[2]);

        let result = [p1_p, p2_p, p3_p];
        return result;
    });

    const filteredTriples = projTriples.filter(triple => {
        const point1 = triple[0];
        const point2 = triple[1];
        const point3 = triple[2];

        const normal = normalize(crossProduct(point1, point2, point3));

        const x = point1.x;
        const y = point1.y;
        const z = point1.z;
        
        // Compare normal with vector -- < 0 --> < 90° 
        return (normal.x * x + normal.y * y + normal.z * z) < 0;
    });

    let clippedTriples = filteredTriples.flatMap(triple => {

        // const plane = {
        //     planePoint: toPoint3d(0, 0, 0.1),
        //     planeNormal: toPoint3d(0, 0, -3),
        // };

        const plane = {
            planePoint: toPoint3d(0, 0, -1.0),
            planeNormal: toPoint3d(0, 0, -1),
        };

        return clip(plane, triple);
    });

    // let filteredclippedTriples = clippedTriples.filter(triple => {
    //     const point1 = triple[0];
    //     const point2 = triple[1];
    //     const point3 = triple[2];

    //     const cross = normalize(crossProduct(point1, point2, point3));

    //     const x = point1.x;
    //     const y = point1.y;
    //     const z = point1.z;

    //     return (cross.x * x + cross.y * y + cross.z * z) < 0;
    // });

    clippedTriples = clippedTriples.sort((t1, t2) => {
        const z1 = (t1[0].z + t1[1].z + t1[2].z);
        const z2 = (t2[0].z + t2[1].z + t2[2].z);
        return z1 - z2;
    });
   
    const canvasTriples = clippedTriples.map(triple => {
        const color = calcColor(triple[0], triple[1], triple[2]); 

        const p1 = projected3dTo2d(triple[0]);
        const p2 = projected3dTo2d(triple[1]);
        const p3 = projected3dTo2d(triple[2]);

        const c1 = toCanvasPoint(p1);
        const c2 = toCanvasPoint(p2);
        const c3 = toCanvasPoint(p3);

        let result = [c1,c2,c3];
        result.color = color;
        return result;

    });

     const clippedCanvasTriples = canvasTriples.flatMap(triple => {
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

    });

    for (const triple of clippedCanvasTriples) {
        drawTriangle(triple[0], triple[1], triple[2], triple.color);
    }

    // for (const triple of clippedTriples) {

    //     const p1 = triple[0];
    //     const p2 = triple[1];
    //     const p3 = triple[2];

    //     const p1_p = project(triple[0]);
    //     const p2_p = project(triple[1]);
    //     const p3_p = project(triple[2]);

    //     const color = calcColor(p1, p2, p3);

    //     const p1_2d = toCanvasPoint(p1_p);
    //     const p2_2d = toCanvasPoint(p2_p);
    //     const p3_2d = toCanvasPoint(p3_p);

    //     drawTriangle(p1_2d, p2_2d, p3_2d, color);

    // }

    // TODO: Iterate clippedTriples
    //      project to 2d triples
    //      transform to canvas coordinates
    //      draw triangle
    // const coords2d = coords3dTransformed.map(coord => {
    //     const point2d = project(coord);
        
    //     return toCanvasPoint(point2d);
    // });

    // for (area of filteredAreas) {
    //     ctx.fillStyle = calcColor(area);
    //     ctx.beginPath();
    //     ctx.moveTo(coords2d[area[0]-1].x, coords2d[area[0]-1].y);
    //     ctx.lineTo(coords2d[area[1]-1].x, coords2d[area[1]-1].y);
    //     ctx.lineTo(coords2d[area[2]-1].x, coords2d[area[2]-1].y);
    //     ctx.closePath();
    //     ctx.fill();
    // } 
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
            camera.z += 0.4;
            break;
        case '-':
            camera.z -= 0.4;
            break;

            case 'a':
                camera.x -= 0.4;
                break;
            case 'd':
                camera.x += 0.4;
                break;

            case 'w':
                camera.y -= 0.4;
                break;
            case 's':
                camera.y += 0.4;
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




