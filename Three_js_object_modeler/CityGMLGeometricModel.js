import { normalize } from 'three/src/math/MathUtils';
import * as Utils from './utils/utils'
import matrix, * as Matrix from "matrix-js"
import * as THREE from 'three';
import Earcut from "earcut";
import { ExactNumber as N } from 'exactnumber/dist/index.umd';
import { ExactMatrix } from './utils/exactMatrix';

class Point3D{
    static maxId = 0;
    static pointsList = [];
    constructor(x,y,z){
        this.x=N(String(x));
        this.y=N(String(y));
        this.z=N(String(z));
        this.id = Point3D.maxId;
        Point3D.maxId+=1;
        Point3D.pointsList.push(this);
    }
    toString(){
        return "P3D("+this.x.toString()+","+this.y.toString()+","+this.z.toString()+")";
    }
}

class LinearRing{
    static epsilon = 1;
    constructor(positions){
        this.positions = positions;
        this.size = positions.length;
        this.planeEquation=[N(0),N(0),N(0),N(0)];
        //checkValidity calcul aussi l'equation de plan et la mets à jour
        if(!this.checkValidity()){
            throw new Error("Linear ring not valid");
            //console.error("Linear ring not valid");
        }
        
    }

    find(id_point){
        let p = null;
        this.positions.forEach(point3D=>{
            if(id_point==point3D.id){
                p = point3D;
            }
        })
        //console.log(id_point, this.positions);
        return p;
    }

    addPoint(point){
        this.positions.push(point);
        if(this.checkValidity()){
            this.size+=1;
        }
        else{
            this.positions.pop();
            throw new Error("Linear ring not valid, impossible to add the point " + point.toString());
            //console.error("Linear ring not valid, impossible to add the point " + point.toString());
        }
    }

    insertPoint(point, i){
        if(i>this.size && i<0){
            throw new Error("Bad position argument, can not insert the point "+point.toString()+" in the LinearRing");
            //console.error("Bad position argument, can not insert the point "+point.toString()+" in the LinearRing");
        }
        else{
            this.positions.splice(i, 0, point);
            if(this.checkValidity()){
                this.size+=1;
            }
            else{
                this.positions.pop();
                throw new Error("Linear ring not valid, impossible to insert the point " + point.toString());
                //console.error("Linear ring not valid, impossible to insert the point " + point.toString());
            }
        }
    }

    getPoint(i){
        if(i>this.size && i<0){
            throw new Error("Bad position argument, can not get the point "+i+" in the LinearRing");
            //console.error("Bad position argument, can not get the point "+i+" in the LinearRing");
        }
        return(this.positions[i]);
    }

    checkValidity(){
        if(this.size == 0){
            return true;
        }
        let tested = false; // Tested permet de savoir si au moins un des triangles était valide
        for(let i=0; i<this.size-2; i++){
            for(let j=i+1; j<this.size-1; j++){
                for(let k=j+1; k<this.size; k++){
                    let [p1,p2,p3] = [this.positions[i], this.positions[j], this.positions[k]];
                    
                    //On réoriente le triangle si il n'est' pas dans le sens trigonométrique.

                    /*let orientation = Utils.orientation([p1.x, p1.y, p1.z],[p2.x, p2.y, p2.z],[p3.x, p3.y, p3.z]);
                    if (orientation<0){
                        let mem = p2;
                        p2 = p3;
                        p3 = mem;
                    }*/
                    
                    
                    
                    let v1 = [p2.x.sub(p1.x),p2.y.sub(p1.y),p2.z.sub(p1.z)];
                    let v2 = [p3.x.sub(p1.x),p3.y.sub(p1.y),p3.z.sub(p1.z)];
                    
                    let alpha = Utils.angle(v1,v2);
                    if (alpha.eq(N(0))){
                        break;
                    }
                    else{
                        tested = true;
                        let n = Utils.crossProduct(v1,v2);
                        let [a,b,c] = n;
                        
                        let d = N(0).sub(a.mul(p1.x)).sub(b.mul(p1.y)).sub(c.mul(p1.z));

                        this.planeEquation = [a,b,c,d];

                        this.positions.forEach(p=>{
                            let dist = Utils.distance_Point_Pl([p.x,p.y,p.z], [a,b,c,d]);
                            if (dist.gt(N(LinearRing.epsilon))){
                                return false;
                            }
                        })
                    } 
                }  
            }    
        }
        return tested;
    }

    /**
     * Returns true if the point is inside the linear ring, and false otherwise.
     * @param {Array} point 
     * @returns 
     */
    isInside(point){
        let [a,b,c,d]=this.planeEquation;
        let [x,y,z] = point;
        let inside = true;
        if(a*x+b*y+c*z+d<0.01){
            let nb_touch = 0;
            let M = this.computeToHorizontalMatrix();

            let pt_matrix = matrix([[x],[y],[z],[1]]);
            let h_pt = matrix(M.prod(pt_matrix));
            x = h_pt(0,0);
            y = h_pt(1,0);
            
            for(let i=0; i<this.positions.length; i++){
                let pt1 = this.positions[i];
                let pt2 = this.positions[(i+1)%this.positions.length];


                let pt1_mat = matrix([[pt1.x], [pt1.y], [pt1.z],[1]]);
                let pt2_mat = matrix([[pt2.x], [pt2.y], [pt2.z],[1]]);
                let h_pt1 = matrix(M.prod(pt1_mat));
                let h_pt2 = matrix(M.prod(pt2_mat));
                let x1 = h_pt1(0,0);
                let y1 = h_pt1(1,0);

                let x2 = h_pt2(0,0);
                let y2 = h_pt2(1,0);
                if(y2-y1!=0){
                    let t=-(y1-y)/(y2-y1);
                    let xmax = Math.max(x1,x2);
                    let xmin = Math.min(x1,x2);
                    let ymax = Math.max(y1,y2);
                    let ymin = Math.min(y1,y2);
                    let x_int = x1+t*(x2-x1);
                    let y_int = y1+t*(y2-y1);

                    

                    if(xmin<=x_int && xmax>= x_int && ymin<=y_int && ymax>=y_int && t>=0){
                        //console.log(x,y, "["+xmin+","+xmax+"]"+", ["+ymin+","+ymax+"]");
                        console.log(t);
                        nb_touch++;
                    }
                }
            }
            if(nb_touch%2==0){
                inside=false;
            }
        }
        else{
            inside = false;
        }
        return inside;
    }

    //Specific utils function
    computeToHorizontalMatrix(){
        let [a,b,c,d] = this.planeEquation;
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
        
        let Mr = new ExactMatrix([
            [u       ,u.mul(v), v      , N(0)],
            [u.mul(v),v.mul(v), u.neg(), N(0)],
            [v.neg() ,u       ,N(0)    , N(0)],
            [N(0)    ,N(0)    ,N(0)    , N(1)]
        ])
        return Mr;
    }

    reverse(){
        this.positions.reverse();
    }

}

class Surface{
    constructor(){

    }

    checkValidity(){
        return true;
    }
}

class Polygon extends Surface{
    static maxId = 0;
    static epsilon = 1;
    constructor(interiors, exterior){
        super();
        this.interiors = interiors;
        this.exterior = exterior;
        this.id = Polygon.maxId;
        Polygon.maxId+=1;
        this.triangulation = [];
        this.planeEquation = [N(0),N(0),N(0),N(0)];
        //check validity mets à jour l'équation de plan
        if(this.checkValidity()){
            this.triangulate();
        }
        else{
            throw new Error("Polygon not valid");
        }
        /*console.log(this.id+" ["+this.planeEquation[0].toString()+","+this.planeEquation[1].toString()+","
        +this.planeEquation[2].toString()+","+this.planeEquation[3].toString()+"]");*/
    }
    checkValidity(){
        
        let valid = (this.exterior.size != 0) && this.exterior.checkValidity();
        let plan1 = this.exterior.planeEquation;
        this.planeEquation = this.exterior.planeEquation;
        this.interiors.forEach(interior=>{
            valid = valid && interior.checkValidity();
            let plan2 = interior.planeEquation;

            console.log(Utils.distance_Pl_Pl(plan1, plan2).toNumber(), Utils.distance_Pl_Pl(plan1, plan2).lte(N(Polygon.epsilon)))
            if(Utils.distance_Pl_Pl(plan1, plan2).lte(N(Polygon.epsilon))){
                if(plan1[0].mul(plan2[0]).lt(N(0)) && plan1[1].mul(plan2[1]).lt(N(0)) && plan1[2].mul(plan2[2]).lt(N(0)) && plan1[3].mul(plan2[3]).lt(N(0))){
                    for(let i=0; i<=3; i++){
                        plan2[i].neg();
                    }
                }
                this.planeEquation = [plan1[0].add(plan2[0]).div(N(2)), plan1[1].add(plan2[1]).div(N(2)),plan1[2].add(plan2[2]).div(N(2)),plan1[3].add(plan2[3]).div(N(2))]
                valid = true;
            }
            else{
                valid = false;
            }
        })
        /*
        if(valid){
            let normal = this.planeEquation.slice(0,3);
            let d = this.planeEquation[3];
            let n = Utils.norme(normal);
            normal = Utils.normalize(normal);
            this.planeEquation = [...normal, d.div(n)];
        }*/
        
        return valid;
    }
    triangulate(){
        let points = this.exterior.positions;
        this.interiors.forEach(interior=>{
            points.push(...interior.positions);
        })
        
        

        let pointsCoordinates = [];
        points.forEach(point3D=>{
            pointsCoordinates = pointsCoordinates.concat([point3D.x.toNumber(), point3D.y.toNumber(), point3D.z.toNumber()]);
        })
        
        let holes=[];
        let hole_index = this.exterior.size;
        this.interiors.forEach(interior=>{
            holes = [hole_index];
            hole_index+=interior.size;
        })
        
        if(!this.planeEquation[2].isZero()){  
            this.triangulation = Earcut(pointsCoordinates, holes, 3);
        }
        //Si la face est verticale, il faut la rendre horizontale
        else{
            let M = this.computeToHorizontalMatrix();
            for(let i=0; i<pointsCoordinates.length/3; i++){
                let pt = new ExactMatrix([[pointsCoordinates[3*i]], [pointsCoordinates[3*i+1]], [pointsCoordinates[3*i+2]],[1]]);
                let h_pt = M.prod(pt);
                pointsCoordinates[3*i    ] = h_pt[0][0].toNumber();
                pointsCoordinates[3*i + 1] = h_pt[1][0].toNumber();
                pointsCoordinates[3*i + 2] = h_pt[2][0].toNumber();
            }
            this.triangulation = Earcut(pointsCoordinates, holes, 3);
        }



        //On remplace la valeur représentant les points (indice dans le tableau positions) par leur indice (attribut de l'objet point3D)
        
        for (let i=0; i<this.triangulation.length; i++){
            this.triangulation[i]=points[this.triangulation[i]].id;
        }

        //On réoriente les triangles si ils ne sont pas dans le meme sens que les faces.
        let exterior_ids = [];
        let interiors_ids = [];

        this.exterior.positions.forEach(p=>{
            exterior_ids.push(p.id);
        });
        this.interiors.forEach(interior=>{
            let interior_ids = [];
            interior.positions.forEach(p=>{
                interior_ids.push(p.id);
            });
            interiors_ids.push(interior_ids);
        });


        for (let i=0; i<this.triangulation.length/3; i++){
            let p1_id = this.triangulation[3*i  ];
            let p2_id = this.triangulation[3*i+1];
            let p3_id = this.triangulation[3*i+2];
            let e1 = [p2_id, p1_id];
            let e2 = [p3_id, p2_id];
            let e3 = [p1_id, p3_id];
            if(Utils.isSubArray(exterior_ids,e1)||Utils.isSubArray(exterior_ids,e2)||Utils.isSubArray(exterior_ids,e3)){
                let mem = this.triangulation[3*i+1];
                this.triangulation[3*i+1] = this.triangulation[3*i+2];
                this.triangulation[3*i+2] = mem;
            }
            interiors_ids.forEach(interior_ids=>{
                if(Utils.isSubArray(interior_ids,e1)||Utils.isSubArray(interior_ids,e2)||Utils.isSubArray(interior_ids,e3)){
                    let mem = this.triangulation[3*i+1];
                    this.triangulation[3*i+1] = this.triangulation[3*i+2];
                    this.triangulation[3*i+2] = mem;
                }
            })
        }

        //To Do : vérifier l'orientation relative des triangles
        let edges = [];
        for (let i=0; i<this.triangulation.length/3; i++){
            let p1_id = this.triangulation[3*i  ];
            let p2_id = this.triangulation[3*i+1];
            let p3_id = this.triangulation[3*i+2];
            let e1 = [p2_id, p1_id];
            let e2 = [p3_id, p2_id];
            let e3 = [p1_id, p3_id];
            if(Utils.isSubArray(edges,e1)||Utils.isSubArray(edges,e2)||Utils.isSubArray(edges,e3)){
                let mem = this.triangulation[3*i+1];
                this.triangulation[3*i+1] = this.triangulation[3*i+2];
                this.triangulation[3*i+2] = mem;
            }
        }
    }

    find(id_point){

        let point = this.exterior.find(id_point);
        if (!point){
            point = this.interior.find(id_point);
        }
        return point;
    }

    reverse(){
        this.exterior.reverse();
        this.interiors.forEach(int=>{
            this.interiors.reverse();
        })
    }



    //Specific utils function
    computeToHorizontalMatrix(){
        let [a,b,c,d] = this.planeEquation;
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
        
        let Mr = new ExactMatrix([
            [u       , u.mul(v), v      , N(0)],
            [u.mul(v), v.mul(v), u.neg(), N(0)],
            [v.neg() , u       ,N(0)    , N(0)],
            [N(0)    , N(0)    ,N(0)    , N(1)]
        ])
        return Mr;
    }

    /**
     * Calcul le paramètre t où le rayon point+t*vector intersecte
     * le polygon (renvoie NaN si il n'y a pas d'intersection).
     * @param {Array} point 
     * @param {Array} vector 
     * @returns 
     */
    intersectRay(point, vector){
        let [a,b,c,d] = this.planeEquation;
        let [x_p,y_p,z_p] = point;
        let [x_v,y_v,z_v] = vector;
        let t = NaN;
        if(c*z_v+b*y_v+a*x_v != 0){
            t = -(c*z_p+b*y_p+a*x_p+d)/(c*z_v+b*y_v+a*x_v);
            let pi = [x_p+t*x_v, y_p+t*y_v, z_p+t*z_v];
            if(t>0){
                //console.log(t);
            }
            if(!this.exterior.isInside(pi) || this.interior.isInside(pi)){
                t = NaN;
            }
        }

        return t;

    }
    invertPlaneEquation(){
        this.planeEquation[0].neg();
        this.planeEquation[1].neg();
        this.planeEquation[2].neg();
        this.planeEquation[3].neg();

        this.exterior.planeEquation = this.planeEquation;
        this.interior.planeEquation = this.planeEquation;
    }

}

class MultiSurface{
    constructor(surfaces){
        this.surfaces=surfaces;
        this.size = this.surfaces.length;
    }
    add(surface){
        this.surfaces.push(surface);
        this.size+=1;
    }
    checkValidity(){
        //check that the surface define a closed volume
        return true;
    }


}



export {Surface, Point3D, Polygon, LinearRing, MultiSurface}
