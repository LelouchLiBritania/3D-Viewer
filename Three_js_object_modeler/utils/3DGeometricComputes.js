import matrix from "matrix-js";
import * as Utils from './utils';
import { normalize } from "three/src/math/MathUtils";
import Earcut from "earcut";
import { ExactNumber as N } from "exactnumber/dist/index.umd";
import { ExactMatrix } from "./exactMatrix";


function crossMatrix(v){
    let [x,y,z] = v;
    return[[ 0, -z,  y],
           [ z,  0, -x],
           [-y,  x,  0]];
}

/**
 * 
 @param  {...float[][]} lines : the lines parameters, defined like this : [[origin coord],[direction vector]] (vector should be normalized)
 * @returns The coordinates of the closest point to the N lines
 */
function findClosestPointToNLines(...lines){
    let W0 = matrix([[0,0,0],
                     [0,0,0],
                     [0,0,0]]);
    let W1 = matrix([[0],
                     [0],
                     [0]]);

    lines.forEach(line => {
        let [[x_o, y_o, z_o], [x,y,z]] = line;
        let cm_v = matrix(crossMatrix([x.toNumber(),y.toNumber(),z.toNumber()]));
        let W0_i = matrix(matrix(cm_v.trans()).prod(cm_v));
        W0 = matrix(W0.add(W0_i));

        let Pi = matrix([[x_o.toNumber()],
                         [y_o.toNumber()],
                         [z_o.toNumber()]]);
        let W1_term = matrix(W0_i.prod(Pi));
        W1 = matrix(W1.add(W1_term));
    });
    let closestPoint = matrix(W0.inv()).prod(W1);
    closestPoint[0] = N(String(closestPoint[0]));
    closestPoint[1] = N(String(closestPoint[1]));
    closestPoint[2] = N(String(closestPoint[2]));
    return closestPoint;
}

/**
 * 
 * @param {float[]} point 
 * @param {float[][]} line : the line parameters, defined like this : [[origin coord],[direction vector]] (vector should be normalized)
 */
function projectPointOnLine(point, line){
    let [x_p, y_p, z_p] = point;
    let [[x_o, y_o, z_o], v] = line;

    //v = Utils.normalize(v);

    let OP = [x_p.sub(x_o), y_p.sub(y_o), z_p.sub(z_o)];
    let norme = Utils.dotProduct(OP,v);
    return [x_o.add(norme.mul(v[0])),y_o.add(norme.mul(v[1])),z_o.add(norme.mul(v[2]))];
}

/**
 * 
 * @param {Array} plan1 The first plan's equation coefficients
 * @param {Array} plan2 The second plan's equation coefficients
 * @param {Array} plan3 The third plan's equation coefficients
 * @returns The intersection point of the 3 plans (if this point exists).
 */
function computeIntersectionPoint(plan1,plan2,plan3){
    let [a1,b1,c1,d1] = plan1;
    let [a2,b2,c2,d2] = plan2;
    let [a3,b3,c3,d3] = plan3;

    let A = new ExactMatrix([[a1,b1,c1],
                    [a2,b2,c2],
                    [a3,b3,c3]]);

    //A.print();
    //console.log(A.det());
    if(A.det().isZero()){
        return [NaN,NaN,NaN];
    }

    let D = new ExactMatrix([[d1.neg()],
                    [d2.neg()],
                    [d3.neg()]]);

    let p = A.inv().prod(D);
    return [p[0][0].toNumber(),p[1][0].toNumber(),p[2][0].toNumber()];
}

/**
 * Calcule la valeur de t (t étant la valuer du shift du plan mobile) pour laquelle le trinagle
 * définit par les 4 plans s'applatit. 
 * @param {Array} planMobile Equation de plan du plan mobile 
 * @param {Array} plan1 Equation de plan du plan fixe 1
 * @param {Array} plan2 Equation de plan du plan fixe 2
 * @param {Array} plan3 Equation de plan du plan fixe 3
 */
function computeShiftTValidity(planMobile, plan1, plan2, plan3){
    let [a_4,b_4,c_4,d_4] = planMobile;
    let [a_1,b_1,c_1,d_1] = plan1;
    let [a_2,b_2,c_2,d_2] = plan2;
    let [a_3,b_3,c_3,d_3] = plan3;

    let num = ((a_1.mul(b_2).sub(a_2.mul(b_1))).mul(c_3).add((a_3.mul(b_1).sub(a_1.mul(b_3))).mul(c_2)).add((a_2.mul(b_3).sub(a_3.mul(b_2))).mul(c_1)).mul(d_4)).add(((a_2.mul(b_1).sub(a_1.mul(b_2))).mul(c_4)).add((a_1.mul(b_4).sub(a_4.mul(b_1))).mul(c_2)).add((a_4.mul(b_2).sub(a_2.mul(b_4))).mul(c_1)).mul(d_3)).add(((a_1.mul(b_3).sub(a_3.mul(b_1))).mul(c_4)).add((a_4.mul(b_1).sub(a_1.mul(b_4))).mul(c_3)).add((a_3.mul(b_4).sub(a_4.mul(b_3))).mul(c_1)).mul(d_2)).add(((a_3.mul(b_2).sub(a_2.mul(b_3))).mul(c_4)).add((a_2.mul(b_4).sub(a_4.mul(b_2))).mul(c_3)).add((a_4.mul(b_3).sub(a_3.mul(b_4))).mul(c_2)).mul(d_1));
    let den = ((a_1.mul(b_2).sub(a_2.mul(b_1))).mul(c_3).add((a_3.mul(b_1).sub(a_1.mul(b_3))).mul(c_2)).add((a_2.mul(b_3).sub(a_3.mul(b_2))).mul(c_1)));
    let t=N(0);

    //console.log(num, den);
    if (den.isZero()){
        if(num.gt(N(0))){
            t=Infinity;
        }
        else{
            t=-Infinity;
        }
    }
    else{
        t = num.div(den);
    }
     
    return t;

}


/**
 * Computes the value of t (t being the value of the mobile plan shift)
 * for which the mobile plan passes by the point defined 
 * as the intersection of the plans 1,2 and 3. 
 * @param {Array} planMobile Equation de plan du plan mobile 
 * @param {Array} plan1 Equation de plan du plan fixe 1
 * @param {Array} plan2 Equation de plan du plan fixe 2
 * @param {Array} plan3 Equation de plan du plan fixe 3
 */
function computeTCollision(planMobile, plan1, plan2, plan3, printM = false){
    let [a_m,b_m,c_m,d_m] = planMobile;
    let [a_1,b_1,c_1,d_1] = plan1;
    let [a_2,b_2,c_2,d_2] = plan2;
    let [a_3,b_3,c_3,d_3] = plan3;

    let values1 = [[a_2,b_2,c_2],[a_3,b_3,c_3],[a_m,b_m,c_m]];
    let values2 = [[a_1,b_1,c_1],[a_3,b_3,c_3],[a_m,b_m,c_m]];
    let values3 = [[a_1,b_1,c_1],[a_2,b_2,c_2],[a_m,b_m,c_m]];
    let values4 = [[a_1,b_1,c_1],[a_2,b_2,c_2],[a_3,b_3,c_3]];

    let M1 = new ExactMatrix(values1);
    let M2 = new ExactMatrix(values2);
    let M3 = new ExactMatrix(values3);
    let M4 = new ExactMatrix(values4);
    

    let A1 = M1.det();
    let A2 = M2.det();
    let A3 = M3.det();
    let A4 = M4.det();

    if(printM){
        let values = [[a_1,b_1,c_1,d_1],[a_2,b_2,c_2,d_2],[a_3,b_3,c_3,d_3],[a_m,b_m,c_m,d_m]];
        new ExactMatrix(values).print();
        console.log(A1.toNumber(),d_1.toNumber());
        M1.print();
        console.log(A2.toNumber(),d_2.toNumber());
        M2.print();
        console.log(A3.toNumber(),d_3.toNumber());
        M3.print();
        console.log(A4.toNumber());
        M4.print();
    }

    let num = d_1.neg().mul(A1).add(d_2.mul(A2)).sub(d_3.mul(A3)).add(d_m.mul(A4));
    let den = A4;
    let t=N(0);

    //console.log(num, den);
    if (den.isZero()){
        if(num.gt(N(0))){
            t=Infinity;
        }
        else{
            t=-Infinity;
        }
    }
    else{
        t = num.div(den);
    }
     
    return t;

}




function computeToHorizontalMatrix(planeEquation){
    let [a,b,c,d] = planeEquation;
    let d2, d1, u,v;
    if(!b.isZero()){
        [u,v] = [N(1), a.neg().div(b)];
        d2 = d.neg().div(b);
        d1 = N(0);
    }
    else{
        [u,v] = [b.neg().div(a), N(1)];
        d2 = N(0);
        d1 = d.neg().div(a);
    }
    

    let Mr = matrix([
        [u.toNumber()       , u.mul(v).toNumber(),v.toNumber()       , 0],
        [u.mul(v).toNumber(), v.mul(v).toNumber(),u.neg().toNumber() , 0],
        [v.neg().toNumber() , u.toNumber()       ,0                  , 0],
        [0                  , 0                  ,0                  , 1]
    ])
    return Mr;
}


/**
 * 
 * @param {Array[Array[float]]} exterior 
 * @param {Array[Array[float]]} interior 
 * @param {Array[float]} planeEquation 
 * @returns The array of indices 
 */
function triangulate(exterior, interior, planeEquation){
    let holes=null;
    let pointsCoordinates = [];
    exterior.forEach(pt=>{
        let [x,y,z] = pt;
        pointsCoordinates.push(x,y,z);
    });
    interior.forEach(pt=>{
        let [x,y,z] = pt;
        pointsCoordinates.push(x,y,z);
    });
    if(interior.length!=0){
        holes = [exterior.length];
    }


    let triangulation;

    if(planeEquation[2]!=0){  
        triangulation = Earcut(pointsCoordinates, holes, 3);
    }
    else{
        let M = computeToHorizontalMatrix(planeEquation);
        for(let i=0; i<pointsCoordinates.length/3; i++){
            let pt = matrix([[pointsCoordinates[3*i]], [pointsCoordinates[3*i+1]], [pointsCoordinates[3*i+2]],[1]]);
            let h_pt = matrix(M.prod(pt));
            pointsCoordinates[3*i    ] = h_pt(0,0);
            pointsCoordinates[3*i + 1] = h_pt(1,0);
            pointsCoordinates[3*i + 2] = h_pt(2,0);
        }
        triangulation = Earcut(pointsCoordinates, holes, 3);
    }

    return triangulation;

}

/**
 * 
 * @param {Array[Array[float]]} border 
 */
function checkAutoIntersection(border){
    let n = border.length;
    let auto_intersects = false;
    for(let i=0; i<n; i++){
        let segment1 = [border[i], border[(i+1)%n]];
        for(let j=i+1; j<n; j++){
            let segment2 = [border[j], border[(j+1)%n]];
            auto_intersects = intersects(segment1, segment2);
            if(auto_intersects){
                break;
            }
        }
        if(auto_intersects){
            break;
        }
    }
    return auto_intersects;
}

/**
 * 
 * @param {Array[Array[float]]} border 
 */
function checkAutoIntersectionWithLogs(border){
    let n = border.length;
    let auto_intersects = false;
    for(let i=0; i<n; i++){
        let segment1 = [border[i], border[(i+1)%n]];
        for(let j=i+1; j<n; j++){
            let segment2 = [border[j], border[(j+1)%n]];
            auto_intersects = intersects(segment1, segment2);
            /*if((i==1||i==2)&&j==4){
                console.log('intersects s'+i+' & s'+j+' : ', intersects2(segment1, segment2));
            }*/
            if(auto_intersects){
                console.log('SEGMENT',i,j, segment1, segment2);
                console.log('intersects : ', intersects(segment1, segment2));
                break;
            }
        }
        if(auto_intersects){
            console.log("BREAK");
            break;
        }
    }
    return auto_intersects;
}





/**
 * 
 * @param {Array[Array[]]} segment1 
 * @param {Array[Array[]]} segment2 
 */
function intersects(segment1, segment2){
    let [[x1,y1,z1],[x2,y2,z2]]=segment1;
    let [[x3,y3,z3],[x4,y4,z4]]=segment2;

    let A=matrix([[x1-x2, x4-x3],
                  [y1-y2, y4-y3],
                  [z1-z2, z4-z3]]);
    let D=matrix([[x4-x2],
                  [y4-y2],
                  [z4-z2]]);

    let tA = matrix(A.trans());
    let tAA  =tA.prod(A);

    let [[a,b],[c,d]] = tAA;
    
    let det_tAA = a*d-b*c;
    if(det_tAA==0){
        return false;
    }
    else{
        let tcom_tAA = matrix([[ d,-b],
                               [-c, a]]);
        let t = matrix(tcom_tAA.prod(tA)).prod(D);

        let [t1,t2] = [t[0][0],t[1][0]];
        let res = false;
        if(det_tAA>0){
            res = (t1>=0) && (t1<=det_tAA) &&
                  (t2>=0) && (t2<=det_tAA);
        }
        else{
            res = (t1<=0) && (t1>=det_tAA) &&
                  (t2<=0) && (t2>=det_tAA);
        }
        return (res && (Math.abs(t1)>=0.000001 && Math.abs(t2)>=0.000001 ) 
                    && (Math.abs(t1)>=0.000001 && Math.abs(t2-det_tAA)>=0.000001) &&
                       (Math.abs(t1-det_tAA)>=0.000001 && Math.abs(t2)>=0.000001) && 
                       (Math.abs(t1-det_tAA)>=0.000001 && Math.abs(t2-det_tAA)>=0.000001));
    }

}

 


/**
 * 
 */
function computeIntersectionPoint2(...plans){
    if(plans.length<3){
        console.error("Underconstrained plan")
    }
    else{
    ////Algorithme du pivot de gauss
        let A_values = [];
        let D_values = [];
        //Initilisation du système d'équations
        plans.forEach(plan=>{
            A_values.push(plan.slice(0,3));
            D_values.push([plan[3]]);
        })

        let A = new ExactMatrix(A_values);
        let D = new ExactMatrix(D_values);

        let res = A.solve(D);

        //console.log(A, D);

        if(res.l!=0){
            return([res[0][0].neg().toNumber(),res[1][0].neg().toNumber(),res[2][0].neg().toNumber()]);
        }
        else{
            return [NaN,NaN,NaN];
        }

    }
    
}

//Fonctions auxiliaires pour le pivot de gauss
function reorganize(A, D, step){
    for(let i=step; i<3; i++){
        //Si le coef i del'équation i vaut 0, il faut échanger cet équation avec une autre 
        //dont le ième coef n'est pas 0 (si il y en a un)
        if (A[i][i]==0){
            let j;
            for(j=i+1; j<A.length; j++){
                if(A[j][i]!=0){
                    let m = A[i];
                    A[i] = A[j];
                    A[j] = m;

                    m = D[i];
                    D[i] = D[j];
                    D[j] = m;
                    break;
                }
            }
        }
    }
    return [A,D];
}





export {computeTCollision, computeIntersectionPoint2, intersects, checkAutoIntersectionWithLogs, computeToHorizontalMatrix, checkAutoIntersection, triangulate, computeShiftTValidity,findClosestPointToNLines,projectPointOnLine,computeIntersectionPoint}