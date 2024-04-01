import { div } from "prelude-ls";
import { element } from "prop-types";
import React, { useLayoutEffect, useState } from "react";
import rough from 'roughjs/bundled/rough.esm';
import './App.css';


const generator = rough.generator();

function createElement(x1, y1, x2, y2, type){
  const roughElement = type === "line" ? generator.line(x1, y1, x2, y2):generator.rectangle(x1, y1, x2-x1, y2-y1);
  return { x1, y1, x2, y2, roughElement };
}

const App = () => {

  const [elements, setElements] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [elementType, setElementType] = useState("line");

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    context.clearRect(0,0,canvas.width, canvas.height)

    const roughCanvas = rough.canvas(canvas);
    
    elements.forEach( ({roughElement}) => roughCanvas.draw(roughElement));

  }, [elements]);

  const handleMouseDown = (event) => {
    setDrawing(true);

    const { clientX, clientY} = event;
    const element = createElement(clientX, clientY, clientX, clientY,elementType);
    setElements(prevState => [...prevState, element])
  };
  const handleMouseMove = (event) => {
    if(!drawing) return;

    const {clientX, clientY} = event;
    const index = elements.length -1;
    const {x1, y1} = elements[index];
    const updatedElement = createElement(x1, y1, clientX, clientY, elementType);

    const elementsCopy = [...elements];
    elementsCopy[index] = updatedElement;
    setElements(elementsCopy)
  };
  const handleMouseUp = () => {
    setDrawing(false)
  };

  return (
    <div>
    <div class="toolbar">
    <button onClick={() => setElementType("line")}>L<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 20 20" class="" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M4.167 10h11.666" stroke-width="1.5"></path></svg>
    </button>

    
   
    <button onClick={() => setElementType("rectangle")}>R<svg aria-hidden="true" focusable="false" role="img" viewBox="0 0 24 24" class="" fill="none" stroke-width="2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><g stroke-width="1.5"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><rect x="4" y="4" width="16" height="16" rx="2"></rect></g></svg></button>

  </div>
    <canvas
      id="canvas"
      width={window.innerWidth}
      height={window.innerHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      Canvas
    </canvas>
    </div>
  );
};

export default App;
