import { Point3D, Polygon, LinearRing, MultiSurface } from "../CityGMLGeometricModel";
import { VertexData, TriangleData } from "../graphicalModels";
import { PointData, FaceData, HalfEdgeData, EdgeData } from "../GeometricalProxy";
import { Building, BuildingPart, ClosureSurface, WallSurface, FloorSurface, OuterFloorSurface, GroundSurface, RoofSurface } from "../CityGMLLogicalModel";
import { Controller, DualController } from "../controllers/controller";
import * as Utils from '../utils/utils';
import { Heap } from 'heap-js';
import { ExactNumber as N } from "exactnumber/dist/index.umd";
import { ExactMatrix } from "../utils/exactMatrix";



class GeometryBuilder{
    constructor(){
        this.face_data            = {};
        this.point_data           = {};
        this.halfedge_data        = {};
        this.edge_data            = {};
        this.face_data_object     = {};
        this.point_data_object    = {};
        this.GMLModel     = {};
    } 
    build(building, LoD){
        let minPointId = building.minPointId;
        let maxPointId = building.maxPointId;
        let minFaceId = building.minFaceId;
        let maxFaceId = building.maxFaceId;
        let nPts = maxPointId-minPointId+1;
        let nFaces = maxFaceId-minFaceId+1;
        this.face_data        = {'hExtIndex': new Array(nFaces), 'hIntIndices':new Array(nFaces),'planeEquation':new Array(nFaces)};
        this.point_data       = {'heIndex' : new Array(nPts),'nbAdjacentFaces': new Array(nPts), 'coords':new Array(nPts)};
        this.halfedge_data    = {'fIndex':[],'pIndex' : [], 'oppIndex' : [], 'nextIndex' : [], 'eIndex':[]};
        this.edge_data        = {'heIndex':[]}
        this.GMLModel = building;
        this.LoD = LoD;

        //console.log("Build Begin");

        //First we fill the points data coords
        for(let i=minPointId; i<=maxPointId; i++){
            let point3D=Point3D.pointsList[i];
            this.point_data.coords[point3D.id-minPointId]=[point3D.x, point3D.y, point3D.z];
        }

        
        let boundaryThematicSurfaces = building.getBoundary();
        
        
        //console.log("Surface loop");
        boundaryThematicSurfaces.forEach(thematicSurface=>{
            //let type = thematicSurface.getType();
            let boundarySurfaces = thematicSurface.getLoD(LoD).surfaces;

            boundarySurfaces.forEach(polygon=>{

                //this.face_data filling
                //this.face_data.bIndex[polygon.id] = building.id;
                //this.face_data.type[polygon.id]   = type;
                this.face_data.planeEquation[polygon.id-minFaceId] = polygon.planeEquation;

                //Creation of the half edges
                let n_ext_he = polygon.exterior.size;
                let nb_he = this.halfedge_data.pIndex.length;
                this.face_data.hExtIndex[polygon.id-minFaceId] = [nb_he];

                for(let i=0; i<n_ext_he; i++){
                    let point3Do = polygon.exterior.positions[i];
                    let origin = point3Do.id-minPointId;
                    let point3Dt = polygon.exterior.positions[(i+1)%n_ext_he];
                    let target = point3Dt.id-minPointId;
                    for(let j=0; j<this.halfedge_data.pIndex.length; j++){
                        let origin2 = this.halfedge_data.pIndex[j];
                        let target2 = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[j]];
                        if (origin2==origin && target2==target){
                            polygon.reverse();
                            break;
                        }
                    }
                }

                for(let i=0; i<n_ext_he; i++){
                    let point3D = polygon.exterior.positions[i];
                    let origin = point3D.id-minPointId;
                    let next = nb_he + ((i+1)%n_ext_he);
                    this.halfedge_data.pIndex.push(origin);
                    this.halfedge_data.nextIndex.push(next);
                    this.halfedge_data.fIndex.push(polygon.id-minFaceId);
                    this.point_data.heIndex[origin]=[nb_he+i];
                }

                this.face_data.hIntIndices[polygon.id-minFaceId]=[];
                polygon.interiors.forEach(interior=>{
                    let n_int_he = interior.size;
                    let nb_he = this.halfedge_data.pIndex.length;
                    console.log(this.face_data);
                    this.face_data.hIntIndices[polygon.id-minFaceId].push(nb_he);
                    for(let i=0; i<n_int_he; i++){
                        let point3D = interior.positions[i];
                        let origin = point3D.id-minPointId;
                        let next = nb_he + ((i+1)%n_int_he);
                        this.halfedge_data.pIndex.push(origin);
                        this.halfedge_data.nextIndex.push(next);
                        this.halfedge_data.fIndex.push(polygon.id-minFaceId);
                    }
                })

            })
        })

        //On remplit les données opposite edge des half edges
        //console.log("half_edge loop");
        this.halfedge_data.oppIndex = new Array(this.halfedge_data.pIndex.length);

        for(let i=0; i<this.halfedge_data.pIndex.length; i++){
            let origin = this.halfedge_data.pIndex[i];
            let target = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[i]];
            for(let j=0; j<i; j++){
                let origin2 = this.halfedge_data.pIndex[j];
                let target2 = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[j]];
                if(origin2==target && target2==origin){
                    this.halfedge_data.oppIndex[i]=j;
                    this.halfedge_data.oppIndex[j]=i;
                    break;
                }
            }
        }

        //Compute the edge data
        //console.log("Edge loop");
        this.halfedge_data.eIndex = new Array(this.halfedge_data.pIndex.length).fill(-1);
        for(let i=0; i<this.halfedge_data.pIndex.length; i++){
            if(this.halfedge_data.eIndex[i]==-1){
                let opp_id = this.halfedge_data.oppIndex[i];

                this.edge_data.heIndex.push(i);
                let e_id = this.edge_data.heIndex.length-1;

                this.halfedge_data.eIndex[i] = e_id;
                this.halfedge_data.eIndex[opp_id] = e_id;
            }
        }

        //computes the number of faces adjacent to the points
        //console.log("Arrity loop");
        for(let i=0; i<this.point_data.nbAdjacentFaces.length; i++){
            let he_0 = this.point_data.heIndex[i][0];
            let he = he_0;
            //console.log(he);
            let faces = [];
            let j=0;
            do{
                j++;
                faces = Utils.mergeListsWithoutDoubles(faces,[this.halfedge_data.fIndex[he]]);
                if(this.halfedge_data.oppIndex[he]==undefined&&he!=undefined){
                    console.log("opp",he);
                }
                he = this.halfedge_data.oppIndex[he];
                if(this.halfedge_data.nextIndex[he]==undefined&&he!=undefined){
                    console.log("next",he);
                }
                he = this.halfedge_data.nextIndex[he];
                
            }while(he!=he_0 && j<100)
            
            this.point_data.nbAdjacentFaces[i]=faces.length;
        }

        //console.log("face arrity computed");
        

        this.face_data_object     = new FaceData(this.face_data.planeEquation,this.face_data.hExtIndex, this.face_data.hIntIndices);
        this.point_data_object    = new PointData(this.point_data.coords, this.point_data.heIndex, this.point_data.nbAdjacentFaces);
        this.halfedge_data_object = new HalfEdgeData(this.halfedge_data.pIndex, this.halfedge_data.oppIndex, this.halfedge_data.nextIndex, this.halfedge_data.fIndex, this.halfedge_data.eIndex);
        this.edge_data_object     = new EdgeData(this.edge_data.heIndex);
        
    }

    /**
     * Tries to correct the plans of the model such that it 
     * correspond to the geometry. 
     * @param {Controller} controller 
     */
    correctPlans(controller){
        PriorityFace.instances = [];
        PriorityFace.constraints = new Array(controller.pointData.count);
        for(let i=0; i<PriorityFace.constraints.length; i++){
            PriorityFace.constraints[i] = [];
        }
        
        const customPriorityComparator = (a, b) => b.priority - a.priority;
        const facesQueue = new Heap(customPriorityComparator);
        facesQueue.init([]);
        for(let i=0; i<this.face_data_object.count;i++){
            
            let borders = controller.getFaceBorders(i);
            let points = borders[0];
            borders[1].forEach(interior=>{
                points.push(...interior);
            });
            let priorityFace = new PriorityFace(i,points);
            facesQueue.push(priorityFace);
        }

        while(!facesQueue.isEmpty()){
            console.log(PriorityFace.toString());
            let face = facesQueue.pop();
            let fixedPoints = face.getFixedPoints();
            if(fixedPoints.length>1){
                let d4;
                console.log("face "+face.id+" position constrained by points "+String(fixedPoints));

                for(let i=0; i<fixedPoints.length; i++){
                    let p_id = fixedPoints[i];
                    
                    let plans = PriorityFace.constraints[p_id].slice(0,3);
                    let equations = [];
                    plans.forEach(plan=>{
                        equations.push([...controller.faceData.planeEquation[plan]]);
                    })
                    equations.push([...controller.faceData.planeEquation[face.id]]);
                    let values1 = [[...equations[1].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                    let values2 = [[...equations[0].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                    let values3 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[3].slice(0,3)]];
                    let values4 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[2].slice(0,3)]];

                    let d1 = equations[0][3];
                    let d2 = equations[1][3];
                    let d3 = equations[2][3];
                    if(typeof(d1)=="number"){
                        d1 = N(d1);
                    }
                    if(typeof(d2)=="number"){
                        d2 = N(d2);
                    }
                    if(typeof(d3)=="number"){
                        d3 = N(d3);
                    }

                    let A1 = (new ExactMatrix(values1)).det();
                    let A2 = (new ExactMatrix(values2)).det();
                    let A3 = (new ExactMatrix(values3)).det();
                    let A4 = (new ExactMatrix(values4)).det();
                    let d4_i = d1.mul(A1).sub(d2.mul(A2)).add(d3.mul(A3)).div(A4);//(d1*A1-d2*A2+d3*A3)/A4
                    if(d4){
                        if(!d4.eq(d4_i)){
                            throw new Error("Correction impossible, to many constraint on a face.");
                        }
                    }
                    else{
                        d4 = d4_i;
                    }
                }
                controller.faceData.planeEquation[face.id][3]=d4;

                
            }
            else if(fixedPoints.length==1){
                let p_id = fixedPoints[0];
                console.log("face "+face.id+" position constrained by point "+p_id);
                let plans = PriorityFace.constraints[p_id].slice(0,3);
                let equations = [];
                plans.forEach(plan=>{
                    equations.push([...controller.faceData.planeEquation[plan]]);
                })
                equations.push([...controller.faceData.planeEquation[face.id]]);
                let values1 = [[...equations[1].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                let values2 = [[...equations[0].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                let values3 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[3].slice(0,3)]];
                let values4 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[2].slice(0,3)]];

                let d1 = equations[0][3];
                let d2 = equations[1][3];
                let d3 = equations[2][3];
                if(typeof(d1)=="number"){
                    d1 = N(d1);
                }
                if(typeof(d2)=="number"){
                    d2 = N(d2);
                }
                if(typeof(d3)=="number"){
                    d3 = N(d3);
                }

                let A1 = (new ExactMatrix(values1)).det();
                let A2 = (new ExactMatrix(values2)).det();
                let A3 = (new ExactMatrix(values3)).det();
                let A4 = (new ExactMatrix(values4)).det();

                let d4 = d1.mul(A1).sub(d2.mul(A2)).add(d3.mul(A3)).div(A4);//(d1*A1-d2*A2+d3*A3)/A4
                controller.faceData.planeEquation[face.id][3]=d4;

            }

            face.points_id.forEach(p_id=>{
                PriorityFace.constraints[p_id].push(face.id);
            })
            PriorityFace.updatePriorities();

        }
        
    }

    /**
     * 
     * @returns A Controller object corresponding to this scene.
     */
    getScene(material){
        let c;
        /*try{*/
            c = new Controller(this.face_data_object, this.point_data_object, this.halfedge_data_object, this.edge_data_object, this.LoD, material);
            this.correctPlans(c);
            c.onChange();
            return (c);
        /*}
        catch(error){
            console.error("Building could not be imported due to "+error);
            return (undefined);
        }*/
        
    }

}

class PriorityFace{
    instances = [];
    constraints = [];
    
    constructor(f_id, points){
        this.priority = 0;
        this.id = f_id;
        this.points_id = points;

        PriorityFace.instances.push(this);
    }
    static updatePriorities(){
        PriorityFace.instances.forEach(instance=>{
            let prio=0; 
            instance.points_id.forEach(p_id=>{
                if(PriorityFace.constraints[p_id].length>=3){
                    prio+=1;
                }
            })
            instance.priority = prio;
        })
    }

    getFixedPoints(){
        let fixedPoints = [];
        this.points_id.forEach(p_id=>{
            if(PriorityFace.constraints[p_id].length>=3){
                fixedPoints.push(p_id);
            }
        })
        return fixedPoints;
    }

    static toString(){
        let s = "-".repeat(12)+"\n";
        for(let i=0; i<PriorityFace.constraints.length; i++){
            s+=String(i)+" : "+String(PriorityFace.constraints[i].length);
            s+=",    ["+String(PriorityFace.constraints[i])+"]\n";
        }
        s += "-".repeat(12);
        return s;
    }
    
}



export {GeometryBuilder}