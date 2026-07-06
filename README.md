# Semi-automatic polyhedral modeler

This polyhedral modeler is based on the face shift and edge flip tools. It is the implementation of the work presented in this [Ph.D. thesis](https://theses.fr/s358836).

## Install

Before launching, you need to install the dependencies.

The dependencies are installed using node.

```bash
git clone https://github.com/LelouchLiBritania/Polyhedral-Modeler.git
cd Polyhedral-Modeler
npm install
```



## Launch local server

The local server can be launched with the following command :

```bash
npx vite
```



## Documentation

The user documentation is available [here](./Documentation.md)




## Package dependencies

|       **package**       | **version** |                           **doc**                            |
| :---------------------: | :---------: | :----------------------------------------------------------: |
|          three          |   0.151.3   |               [threejs](https://threejs.org/)                |
|         earcut          |    2.2.4    | [earcut_npm](https://www.npmjs.com/package/earcut?activeTab=readme) |
|       exactnumber       |    1.0.1    | [exactnumber_npm](https://www.npmjs.com/package/exactnumber) |
|        matrix-js        |    1.6.1    |   [matrix-js_npm](https://www.npmjs.com/package/matrix-js)   |
| cityjson-threejs-loader |    0.4.0    | [cityjson-threejs-loader_npm](https://www.npmjs.com/package/cityjson-threejs-loader) |
|         heap-js         |    2.5.0    |     [heap-js_npm](https://www.npmjs.com/package/heap-js)     |
|          vite           |    4.3.3    |        [vite_npm](https://www.npmjs.com/package/vite)        |
|   regenerator-runtime   |   0.13.9    | [regenerator-runtime_npm](https://www.npmjs.com/package/regenerator-runtime) |



## If you use this code or part of this code in scientific work, please cite our two articles

```bibtex
@inproceedings{10.1145/3746237.3746298,
    author = {Geniet, Florent and Vallet, Bruno and Bredif, Mathieu},
    title = {Exact Computation for Robust 3D Polyhedral Interactive Modeling},
    year = {2025},
    isbn = {9798400720383},
    publisher = {Association for Computing Machinery},
    address = {New York, NY, USA},
    url = {https://doi.org/10.1145/3746237.3746298},
    doi = {10.1145/3746237.3746298},
    abstract = {This article introduces how an exact computation library based on rational arithmetic has been used in a polyhedral modeler based on face shifts and topological event detection. The goal of the use of exact computation is to get rid of the imprecision in the geometrical predicates computations, and thus to avoid false positives and false negatives in the topological events detection. This article also presents two algorithms which transform a polyhedral mesh with an approximated geometry (a mesh with faces which does not co-intersect in one point) into a mesh with the same structure, but with a non-approximate geometry. This is, to our knowledge, the first attempt to use rational arithmetic in a polyhedral modeler to manage the geometrical data. The reasons why rational arithmetic has not been used before are the memory consumption that it can generate, but also the fact that to keep an absolute precision, some operators and functions can not be used (square root, logarithm, trigonometric functions, etc.) and finally the fact that all data are produced using floating-point arithmetic, and so that data should be corrected before use. This article explains how all these issues have been handled.},
    booktitle = {Proceedings of the 30th International Conference on 3D Web Technology},
    pages = {1–9},
    numpages = {9},
    keywords = {3D reconstruction, 3D building models, exact computation, rational computation},
    location = {
    },
    series = {Web3D '25}
}

@Article{isprs-archives-XLVIII-2-W8-2024-169-2024,
    AUTHOR = {Geniet, F. and Br\'edif, M. and Vallet, B.},
    TITLE = {Editing Watertight Manifold Polyhedra using Face Shifts with Automatic Topological Updates and Edge Flips},
    JOURNAL = {The International Archives of the Photogrammetry, Remote Sensing and Spatial Information Sciences},
    VOLUME = {XLVIII-2/W8-2024},
    YEAR = {2024},
    PAGES = {169--176},
    URL = {https://isprs-archives.copernicus.org/articles/XLVIII-2-W8-2024/169/2024/},
    DOI = {10.5194/isprs-archives-XLVIII-2-W8-2024-169-2024}
}
```

<img src="./img/IGN2.png" height="100" /> <img src="./img/lastig.png" alt=" " height="100" /> <img src="./img/Logo_Université_Gustave_Eiffel.png" alt=" " height="100" />





