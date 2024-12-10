import { ExactNumber as N } from "exactnumber/dist/index.umd";
import * as ExactMathUtils from "../utils/exactMathUtils";

class ExactMatrix{
    /**
     * 
     * @param {any[][]} values 
     */
    constructor(values){
        this.values=[];
        this.h = values.length;
        this.l = values[0].length;
        values.forEach(row=>{
            if(row.length!=this.l){
                throw new Error("Can't create matrix with non constant length rows");
            }
            let exactRow = [];
            row.forEach(value=>{
                let exactValue;
                if(typeof(value)=='number'){
                    exactValue = N(String(value));
                }
                else{
                    exactValue = value;
                }
                exactRow.push(exactValue);
            })
            this.values.push(exactRow);
        })

        return new Proxy(this, {
            get: (obj, key)=>{
                if (typeof(key) === 'string' && (Number.isInteger(Number(key)))){ // key is an index
                    return obj.values[key];
                }
                else 
                    return obj[key];
            }/*,
            set: (obj, key, value) => {
                if (typeof(key) === 'string' && (Number.isInteger(Number(key)))) // key is an index
                    return obj.data[key] = value
                else 
                    return obj[key] = value
            }*/
        })
    }

    



    det(){
        if(this.l!=this.h){
            throw Error("Can't compute determinant of a non square matrix");
        }
        else if(this.h==1){

            return this.values[0][0];
        }
        else if(this.h==2){
            let [a,b] = this.values[0];
            let [c,d] = this.values[1];

            return a.mul(b).sub(c.mul(d));
        }
        else if(this.h==3){
            let [a,b,c] = this.values[0];
            let [d,e,f] = this.values[1];
            let [g,h,i] = this.values[2];

            return a.mul(e).mul(i).add(b.mul(f).mul(g)).add(c.mul(d).mul(h)).sub(c.mul(e).mul(g)).sub(b.mul(d).mul(i)).sub(a.mul(f).mul(h));//aei+bfg+cdh-ceg-bdi-afh
        }
        else{
            throw Error("Determinant not yet implemented for 4+ size matrices");
        }

    }

    inv(){
        if(this.l!=this.h){
            throw Error("Can't invert a non square matrix");
        }
        else if(this.h==1){

            if (this.values[0][0].isZero()){
                throw Error("Can't invert matrix with 0 determinant");
            }
            else{
                return new ExactMatrix([[this.values[0][0].inv()]]);
            }
        }
        else if(this.h==2){
            let det = this.det();
            if(det.isZero()){
                throw Error("Can't invert matrix with 0 determinant");
            }

            let [a,b] = this.values[0];
            let [c,d] = this.values[1];

            

            let invValues=[[d.div(det),b.neg().div(det)],[c.neg().div(det), a.div(det)]];
            return new ExactMatrix(invValues);
        }
        else if(this.h==3){

            let det = this.det();
            if(det.isZero()){
                throw Error("Can't invert matrix with 0 determinant");
            }

            let [a,b,c] = this.values[0];
            let [d,e,f] = this.values[1];
            let [g,h,i] = this.values[2];
            
            let v11 = e.mul(i).sub(f.mul(h)).div(det);//(ei-fh)/det
            let v12 = c.mul(h).sub(b.mul(i)).div(det);//(ch-bi)/det
            let v13 = b.mul(f).sub(c.mul(e)).div(det);//(bf-ce)/det
            let row1 = [v11,v12,v13];

            let v21 = f.mul(g).sub(d.mul(i)).div(det);//(fg-di)/det
            let v22 = a.mul(i).sub(c.mul(g)).div(det);//(ai-cg)/det
            let v23 = c.mul(d).sub(a.mul(f)).div(det);//(cd-af)/det
            let row2 = [v21,v22,v23];

            let v31 = d.mul(h).sub(e.mul(g)).div(det);//(dh-eg)/det
            let v32 = b.mul(g).sub(a.mul(h)).div(det);//(bg-ah)/det
            let v33 = a.mul(e).sub(b.mul(d)).div(det);//(ae-bd)/det
            let row3 = [v31,v32,v33];

            return new ExactMatrix([row1, row2, row3]);


        }
        else{
            let det=this.det();
            if(det.isZero()){
                throw Error("Can't invert matrix with 0 determinant");
            }
            let invValues=[];
            for(let i=0; i<this.h; i++){
                let invRow = []
                for(let j=0; j<this.l; j++){
                    let subcomValues=[]
                    for(let k=0; k<this.h; k++){
                        if(k!=j){
                            let subcomRow=[];
                            for(let l=0; l<this.l; l++){
                                if(l!=i){
                                    subcomRow.push(this.values[k][l]);
                                }
                            }
                            subcomValues.push(subcomRow);
                        }
                    }
                    let subcomMatrix = new ExactMatrix(subcomValues);
                    invRow.push(subcomMatrix.det().div(det));//tCom[i,j]
                }
                invValues.push(invRow);
            }
            return new ExactMatrix(invValues);
        }
    }

    /**
     * 
     * @param {ExactMatrix} m 
     */
    prod(m){
        if(m.h!=this.l){
            throw Error("Can't multiply two matrices when length and height don't match");
        }
        else{
            let mulValues=[];
            for(let i=0; i<this.h; i++){
                let mulRow=[];
                for(let j=0; j<m.l; j++){
                    let value = N(0);
                    for(let k=0; k<this.l; k++){
                        let a = this.values[i][k];
                        let b = m.values[k][j];
                        value=value.add(a.mul(b));
                    }
                    mulRow.push(value)
                }
                mulValues.push(mulRow);
            }
            return new ExactMatrix(mulValues);
        }
    }
    
    /**
     * 
     * @param {ExactMatrix} m 
     */
    add(m){
        if(m.l!=this.l || m.h!=this.h){
            throw Error("Can't add two matrices of different size");
        }
        else{
            let addValues=[];
            for(let i=0; i<this.h; i++){
                let addRow=[];
                for(let j=0; j<this.l; j++){
                    let a = this.values[i][j];
                    let b = m.values[i][j];
                    addRow.push(a.add(b));
                }
                addValues.push(addRow);
            }
            return new ExactMatrix(addValues);
        }

    }


    /**
     * Computes the reduced matrix using the Gauss Jordan algorithm.
     */
    reducedMatrix(p=false){
        let r=-1;
        let values_copy = [];
        for (let i=0; i<this.h; i++){
            values_copy.push([...this.values[i]]);
        }


        for(let j=0; j<Math.min(this.l, this.h); j++){
            let k = this.__findMaxAbsoluteValueOnColumn__(j, r+1, values_copy);
            let a_kj = values_copy[k][j];
            if(!a_kj.isZero()){
                r=r+1;
                for(let l=j; l<this.l; l++){
                    values_copy[k][l] = values_copy[k][l].div(a_kj);
                }
                if(k!=r){
                    this.__swapLines__(k,r,values_copy);
                }
                for(let i=0; i<this.h; i++){
                    if(i!=r){
                        let a_ij = values_copy[i][j];
                        for(let l=j+1; l<this.l; l++){
                            values_copy[i][l] = values_copy[i][l].sub(a_ij.mul(values_copy[r][l]));
                        }
                        values_copy[i][j] = N(0);
                    }
                }
            }
            if(p){
                let m = new ExactMatrix(values_copy);
                m.print();
            }
        }
        if(p){
            console.log("[][][][][][]");
            let m = new ExactMatrix(values_copy);
            console.log(r+1);
            this.print();
            m.print();
            console.log("[][][][][][]");
        }
        return new ExactMatrix(values_copy);
    }

    /**
     * Computes the rank of the matrix using the Gauss Jordan algorithm.
     */
    rank(p=false){
        let r=-1;
        let values_copy = [];
        for (let i=0; i<this.h; i++){
            values_copy.push([...this.values[i]]);
        }


        for(let j=0; j<this.l; j++){
            let k = this.__findMaxAbsoluteValueOnColumn__(j, r+1, values_copy);
            let a_kj = values_copy[k][j];
            if(!a_kj.isZero()){
                r=r+1;
                for(let l=j; l<this.l; l++){
                    values_copy[k][l] = values_copy[k][l].div(a_kj);
                }
                if(k!=r){
                    this.__swapLines__(k,r,values_copy);
                }
                for(let i=0; i<this.h; i++){
                    if(i!=r){
                        let a_ij = values_copy[i][j];
                        for(let l=j+1; l<this.l; l++){
                            values_copy[i][l] = values_copy[i][l].sub(a_ij.mul(values_copy[r][l]));
                        }
                        values_copy[i][j] = N(0);
                    }
                }
            }
            if(r>=(Math.min(this.l, this.h)-1)){
                break;
            }
            if(p){
                console.log(r);
                let m = new ExactMatrix(values_copy);
                m.print();
            }
        }
        if(p){
            console.log("[][][][][][]");
            let m = new ExactMatrix(values_copy);
            console.log(r+1);
            this.print();
            m.print();
            console.log("[][][][][][]");
        }
        return r+1;
    }




    /**
     * Computes the rank of the matrix using the Gauss Jordan algorithm.
     */
    solve(D, p=false){
        let r=-1;
        let values_copy = [];
        for (let i=0; i<this.h; i++){
            values_copy.push([...this.values[i]]);
        }


        for(let j=0; j<Math.min(this.l, this.h); j++){
            if(D.h!=this.h||D.l!=1){
                console.error("Wrong parameters size.");
            }
            let k = this.__findMaxAbsoluteValueOnColumn__(j, r+1, values_copy);
            let a_kj = values_copy[k][j];
            if(!a_kj.isZero()){
                r=r+1;
                for(let l=j; l<this.l; l++){
                    values_copy[k][l] = values_copy[k][l].div(a_kj);
                }
                D[k][0] = D[k][0].div(a_kj);
                if(k!=r){
                    this.__swapLines__(k,r,values_copy);
                    this.__swapLines__(k,r,D.values);
                }
                for(let i=0; i<this.h; i++){
                    if(i!=r){
                        let a_ij = values_copy[i][j];
                        for(let l=j+1; l<this.l; l++){
                            values_copy[i][l] = values_copy[i][l].sub(a_ij.mul(values_copy[r][l]));
                        }
                        values_copy[i][j] = N(0);
                        D[i][0] = D[i][0].sub(a_ij.mul(D[r][0]));
                    }
                }
            }
            if(p){
                let m = new ExactMatrix(values_copy);
                m.print();
                D.print();
            }
        }
        if(p){
            console.log("[][][][][][]");
            let m = new ExactMatrix(values_copy);
            console.log(r+1);
            this.print();
            m.print();
            D.print();
            console.log("[][][][][][]");
        }
        if(r+1>=3){
            return D;
        }
        else{
            return new ExactMatrix([[]]);
        }
        
    }

    __findMaxAbsoluteValueOnColumn__(j, i_min, values){
        //console.log(i_min, j, values[i_min]);
        let v=values[i_min][j].abs();
        let id_max = i_min;
        for(let i=i_min+1; i<this.h; i++){
            if(ExactMathUtils.gte(values[i][j].abs(), v)){
                id_max = i;
                v = values[i][j].abs();
            }
        }
        return id_max;
    }

    __swapLines__(i,j,values){
        let mem = values[j];
        values[j]=values[i];
        values[i]=mem;
    }

    print(){
        let interline="-".repeat(21*this.l+1)+"\n";
        let s = interline;
        for(let i=0; i<this.h; i++){
            let l = "[";
            for(let j=0; j<this.l; j++){
                let n = String(this.values[i][j].toNumber());
                l+=(n+" ".repeat(20)).slice(0,20);
                if(j!=this.l-1){
                    l+="|"
                }
            }
            l+="]\n";
            l+=interline;
            s+=l;
        }

        console.log(s);
    }
}

export {ExactMatrix}