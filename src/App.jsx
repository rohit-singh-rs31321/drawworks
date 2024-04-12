import { TbRectangle } from "react-icons/tb";
import { IoRemoveOutline } from "react-icons/io5";
import { BiPointer } from "react-icons/bi";
import { IoIosMenu } from "react-icons/io";
import { FaRegCircle } from "react-icons/fa";
import { BiSolidEraser } from "react-icons/bi";
import { MdLightMode } from "react-icons/md";
import { MdDarkMode } from "react-icons/md";
import { HiMiniComputerDesktop } from "react-icons/hi2";





import { LuDiamond } from "react-icons/lu";

import { IoIosUndo } from "react-icons/io";
import { IoIosRedo } from "react-icons/io";
import { FaPencil } from "react-icons/fa6";
import { PiTextTBold } from "react-icons/pi";
import { HiOutlineDownload } from "react-icons/hi";

import getStroke from "perfect-freehand";
import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
import rough from "roughjs/bundled/rough.esm";
import "./App.css";

const generator = rough.generator();

function createElement(id, x1, y1, x2, y2, type) {

  switch (type) {
    case "line":
    case "rectangle":
      const roughElement = type === "line"
        ? generator.line(x1, y1, x2, y2)
        : generator.rectangle(x1, y1, x2 - x1, y2 - y1);
      return { id, x1, y1, x2, y2, type, roughElement };
    case "pencil":

      return { id, type, points: [{ x: x1, y: y1 }] }
    case "text":
      return { id, type, x1, y1, x2, y2, text: "" }
    default:
      throw new Error(`Type not recognised: ${type}`)
  }
};

const nearpoint = (x, y, x1, y1, name) => {
  return Math.abs(x - x1) < 5 && Math.abs(y - y1) < 5 ? name : null;
};

const onLine = (x1, y1, x2, y2, x, y, maxDistance = 1) => {
  const a = { x: x1, y: y1 };
  const b = { x: x2, y: y2 };
  const c = { x, y };
  const offset = distance(a, b) - (distance(a, c) + distance(b, c));
  return Math.abs(offset) < maxDistance ? "inside" : null;
}

const positionWithinElement = (x, y, element) => {
  const { type, x1, x2, y1, y2 } = element;
  switch (type) {
    case "line":
      const on = onLine(x1, y1, x2, y2, x, y);
      const start = nearpoint(x, y, x1, y1, "start");
      const end = nearpoint(x, y, x2, y2, "end");

      return start || end || on;
    case "rectangle":
      const topLeft = nearpoint(x, y, x1, y1, "tl");
      const topRight = nearpoint(x, y, x2, y1, "tr");
      const bottomLeft = nearpoint(x, y, x1, y2, "bl");
      const bottomRight = nearpoint(x, y, x2, y2, "br");
      const inside = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
      return topLeft || topRight || bottomLeft || bottomRight || inside;
    case "pencil":
      const betweenAnyPoint = element.points.some((point, index) => {
        const nextPoint = element.points[index + 1]
        if (!nextPoint) return false;
        return onLine(point.x, point.y, nextPoint.x, nextPoint.y, x, y, 5) != null;
      })
      return betweenAnyPoint ? "inside" : null;
    case "text":
      return x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;
    default:
      throw new Error(`Type not Recognised: ${type}`)
  }
};
const distance = (a, b) =>
  Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

const getElementAPosition = (x, y, elements) => {
  return elements
    .map((element) => ({
      ...element,
      position: positionWithinElement(x, y, element),
    }))
    .find((element) => element.position !== null);
};
const adjustElementCoordinates = (element) => {
  const { type, x1, y1, x2, y2 } = element;
  if (type === "rectangle") {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return { x1: minX, y1: minY, x2: maxX, y2: maxY };
  } else {
    if (x1 < x2 || (x1 === x2 && y1 < y2)) {
      return { x1, y1, x2, y2 };
    } else {
      return { x1: x2, y1: y2, x2: x1, y2: y1 };
    }
  }
};

const cursorForPosition = (position) => {
  switch (position) {
    case "tl":
    case "br":
    case "start":
    case "end":
      return "nwse-resize";
    case "tr":
    case "bl":
      return "nesw-resize";
    default:
      return "move";
  }
};
const resizedCordinates = (clientX, clientY, position, coordinates) => {
  const { x1, y1, x2, y2 } = coordinates;
  switch (position) {
    case "tl":
    case "start":
      return { x1: clientX, y1: clientY, x2, y2 };
    case "tr":
      return { x1, y1: clientY, x2: clientX, y2 };
    case "bl":
    case "end":
      return { x1, y1, x2: clientX, y2: clientY };
    default:
      return null;
  }
};

const useHistory = (initialState) => {
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState([initialState]);
  const setState = (action, overwrite = false) => {
    const newState =
      typeof action === "function" ? action(history[index]) : action;
    if (overwrite) {
      const historyCopy = [...history];
      historyCopy[index] = newState;
      setHistory(historyCopy);
    } else {
      const updatedState = [...history].slice(0, index + 1);
      setHistory([...updatedState, newState]);
      setIndex((prevState) => prevState + 1);
    }
  };

  const undo = () => index > 0 && setIndex((prevState) => prevState - 1);
  const redo = () =>
    index < history.length - 1 && setIndex((prevState) => prevState + 1);

  return [history[index], setState, undo, redo];
};

const getSvgPathFromStroke = stroke => {
  if (!stroke.length) return ""

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]; // wrap
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ["M", ...stroke[0], "Q"]
  )

  d.push("Z")
  return d.join(" ")
}

const drawElement = (roughCanvas, context, element) => {
  switch (element.type) {
    case "line":
    case "rectangle":
      roughCanvas.draw(element.roughElement);
      break;
    case "pencil":
      const stroke = getSvgPathFromStroke(getStroke(element.points,
        { size: 6 }))
      context.fill(new Path2D(stroke));
      break;
    case "text":
      context.textBaseline = "top";
      context.font = '24px Courier New';
      context.fillText(element.text, element.x1, element.y1);
      break;
    default:
      throw new Error(`Type not recognised: ${element.type}`)
  }
}

const adjustmentRequired = type => ['line', 'rectangle'].includes(type);

const usePressedkeys = () => {
  const [pressedKeys, setPressedKeys] = useState(new Set());

  useEffect(() => {
    const handleKeyDown = event => {
      setPressedKeys(prevKeys => new Set(prevKeys).add(event.key));
    };

    const handleKeyUp = event => {
      setPressedKeys(prevKeys => {
        const updateKeys = new Set(prevKeys);
        updateKeys.delete(event.key);
        return updateKeys;
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp)
    };
  }, []);
  return pressedKeys;
}

const App = () => {
  const [elements, setElements, undo, redo] = useHistory([]);
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("none");
  const [color, setColor] = useState('#ffffff');
  const colors = ['rgb(241 245 249)', 'rgb(254 226 226)', 'rgb(255 237 213)','rgb(250 232 255)', 'rgb(219 234 254)' ];
  const [panOffset, setPanOffset] = React.useState({ x: 0, y: 0 });
  const [startPanMousePosition, setStartPanMousePosition] = React.useState({ x: 0, y: 0 });
  const [selectedElement, setSelectedElement] = useState(null);
  const [scale, setScale] = React.useState(1);
  const [activeSection, setActiveSection] = useState(null);
  const [scaleOffet, setScaleOffset] = React.useState({ x: 0, y: 0 });
  const textAreaRef = useRef();
  const canvasRef = useRef(null);
  const pressedKeys = usePressedkeys();

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");
    const roughCanvas = rough.canvas(canvas);

    context.clearRect(0, 0, canvas.width, canvas.height);

    const scaleWidth = canvas.width * scale;
    const scaleHeight = canvas.height * scale;
    const scaleOffsetX = (scaleWidth - canvas.width) / 2;
    const scaleOffsetY = (scaleHeight - canvas.height) / 2;
    setScaleOffset({ x: scaleOffsetX, y: scaleOffsetY })

    context.save();
    context.translate(panOffset.x * scale - scaleOffsetX, panOffset.y * scale - scaleOffsetY);

    context.scale(scale, scale);

    elements.forEach(element => {
      if (action === "writing" && selectedElement.id === element.id) return;
      drawElement(roughCanvas, context, element)
    });
    context.restore();
  }, [elements, action, selectedElement, panOffset, scale]);

  useEffect(() => {
    const undoRedoFunction = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "z") {
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    document.addEventListener("keydown", undoRedoFunction);
    return () => {
      document.removeEventListener("keydown", undoRedoFunction);
    };
  }, [undo, redo]);
  useEffect(() => {
    const panOrZoomFunction = event => {
      if (pressedKeys.has("Meta") || pressedKeys.has("Control")) onZoom(event.deltaY * -0.01);
      else
        setPanOffset(prevState => ({
          x: prevState.x - event.deltaX,
          y: prevState.y - event.deltaY
        }));
    };
    document.addEventListener("wheel", panOrZoomFunction);
    return () => {
      document.removeEventListener("wheel", panOrZoomFunction);
    };
  }, [pressedKeys]);

  useEffect(() => {
    const textArea = textAreaRef.current;
    if (action === "writing") {
      setTimeout(() => {
        textArea.focus();
        textArea.value = selectedElement.text;
      }, 0);
    }
  }, [action, selectedElement]);

  const handleSetBgCanvas = (index) => {
    setColor(colors[index]);
  };
  const updateElement = (id, x1, y1, x2, y2, type, options) => {
    const elementsCopy = [...elements];

    switch (type) {
      case "line":
      case "rectangle":
        elementsCopy[id] = createElement(id, x1, y1, x2, y2, type);
        break;
      case "pencil":
        elementsCopy[id].points = [...elementsCopy[id].points, { x: x2, y: y2 }]
        break;
      case "text":
        const textWidth = document
          .getElementById("canvas")
          .getContext("2d")
          .measureText(options.text).width;
        const textHeight = 24;

        elementsCopy[id] = {
          ...createElement(id, x1, y1, x1 + textWidth, y1 + textHeight, type),
          text: options.text
        };
        break;
      default:
        throw new Error(`Type not Recognised: ${type}`)
    }

    setElements(elementsCopy, true);
  };

  const getMouseCoordinates = event => {
    const clientX = (event.clientX - panOffset.x * scale + scaleOffet.x) / scale;
    const clientY = (event.clientY - panOffset.y * scale + scaleOffet.y) / scale;
    return { clientX, clientY };
  }

  const handleMouseDown = event => {
    if (action === "writing") return;

    const { clientX, clientY } = getMouseCoordinates(event);
    if (event.button === 1 || pressedKeys.has(" ")) {
      setAction("panning");
      setStartPanMousePosition({ x: clientX, y: clientY });
      return;
    }

    if (tool === "selection") {
      const element = getElementAPosition(clientX, clientY, elements);
      //if we are on an element
      if (element) {
        if (element.type === "pencil") {
          const xOffsets = element.points.map(point => clientX - point.x);
          const yOffsets = element.points.map(point => clientY - point.y);
          setSelectedElement({ ...element, xOffsets, yOffsets });
        } else {
          const offsetX = clientX - element.x1;
          const offsetY = clientY - element.y1;
          setSelectedElement({ ...element, offsetX, offsetY });
        }

        setElements((prevState) => prevState);

        if (element.position === "inside") {
          setAction("moving");
        } else {
          setAction("resizing");
        }
      }
    } else if (tool === "eraser") {
      const element = getElementAPosition(clientX, clientY, elements);
      if (element) {
        setElements(elements.filter(el => el.id !== element.id));
      }
    }
    else {
      const id = elements.length;
      const element = createElement(
        id,
        clientX,
        clientY,
        clientX,
        clientY,
        tool
      );
      setElements((prevState) => [...prevState, element]);

      setSelectedElement(element);
      setAction(tool === "text" ? "writing" : "drawing");
    }
  };
  const handleMouseMove = (event) => {
    const { clientX, clientY } = getMouseCoordinates(event);

    if (action === "panning") {
      const deltaX = clientX - startPanMousePosition.x;
      const deltaY = clientY - startPanMousePosition.y;
      setPanOffset(prevState => ({
        x: panOffset.x + deltaX,
        y: panOffset.y + deltaY,
      }));
      return;
    }

    if (tool === "selection") {
      const element = getElementAPosition(clientX, clientY, elements);
      event.target.style.cursor = element
        ? cursorForPosition(element.position)
        : "pointer";
    } else if (tool === "eraser") {
      event.target.style.cursor = `grab`;
    } else {
      const element = getElementAPosition(clientX, clientY, elements);
      event.target.style.cursor = element
        ? "crosshair"
        : "crosshair";
    }

    if (action === "drawing") {
      const index = elements.length - 1;
      const { x1, y1 } = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
    } else if (action === "moving") {
      if (selectedElement.type === "pencil") {
        const newPoints = selectedElement.points.map((_, index) => ({
          x: clientX - selectedElement.xOffsets[index],
          y: clientY - selectedElement.yOffsets[index]
        }))
        const elementsCopy = [...elements];
        elementsCopy[selectedElement.id].points = newPoints;
        setElements(elementsCopy, true);
      } else {
        const { id, x1, x2, y1, y2, type, offsetX, offsetY } = selectedElement;
        const width = x2 - x1;
        const height = y2 - y1;
        const newX1 = clientX - offsetX;
        const newY1 = clientY - offsetY;
        const options = type === "text" ? { text: selectedElement.text } : {};
        updateElement(id, newX1, newY1, newX1 + width, newY1 + height, type, options);
      }

    } else if (action === "resizing") {
      const { id, type, position, ...coordinates } = selectedElement;
      const { x1, y1, x2, y2 } = resizedCordinates(
        clientX,
        clientY,
        position,
        coordinates
      );
      updateElement(id, x1, y1, x2, y2, type);
    }
  };
  const handleMouseUp = event => {
    const { clientX, clientY } = getMouseCoordinates(event);
    if (selectedElement) {

      if (selectedElement.type === "text" &&
        clientX - selectedElement.offsetX === selectedElement.x1 &&
        clientY - selectedElement.offsetY === selectedElement.y1
      ) {
        setAction("writing")
        return;
      }
      const index = selectedElement.id;
      const { id, type } = elements[index];
      if ((action === "drawing" || action === "resizing") && adjustmentRequired(type)) {
        const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
        updateElement(id, x1, y1, x2, y2, type);
      }
    }

    if (action === "writing") return;
    setAction("none");
    setSelectedElement(null);
  };

  const handleBlur = event => {
    const { id, x1, y1, type } = selectedElement;
    setAction("none")
    setSelectedElement(null)

    updateElement(id, x1, y1, null, null, type, { text: event.target.value })
  }

  const onZoom = delta => {
    setScale(prevState => Math.min(Math.max(prevState + delta, 0.1), 20));
  };

  const saveImageToLocal = (event) => {
    let link = event.currentTarget;
    link.setAttribute("download", "canvas.png");
    let image = canvasRef.current.toDataURL('image/png');
    link.setAttribute('href', image);

  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      switch (event.key) {
        case "1":
          setTool("selection");
          break;
        case "2":
          setTool("line");
          break;
        case "3":
          setTool("rectangle");
          break;
        case "4":
          setTool("diamond");
          break;
        case "5":
          setTool("circle");
          break;
        case "6":
          setTool("pencil");
          break;
        case "7":
          setTool("text");
          break;
        case "0":
          setTool("eraser");
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  const toolClass = (selectedTool) => {
    return tool === selectedTool ? "bg-teal-200 text-teal-800 shadow-lg rounded-sm" : "";
  };
  const handleMenuClick = (section) => {
    setActiveSection(section);
  };

  return (
    <div>
      <div className="fixed top-0 w-full flex justify-self-center items-center z-20 px-4 py-2">
        <button className="bg-teal-200 text-teal-800 shadow-sm rounded-md border p-1" onClick={() => handleMenuClick("menu")} >
          <IoIosMenu size={"1.2rem"} />
        </button>
        <div className="toolbar links flex justify-center items-center bg-slate-50 gap-7 py-3 px-5 w-fit mx-auto border shadow-sm rounded-lg">
          <a className={toolClass("selection")} onClick={() => setTool("selection")} >
            <BiPointer size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">1</span>
          </a>
          <a className={toolClass("line")} onClick={() => setTool("line")}>
            <IoRemoveOutline size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">2</span>
          </a>
          <a className={toolClass("rectangle")} onClick={() => setTool("rectangle")}>
            <TbRectangle size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">3</span>
          </a>
          <a className={toolClass("diamond")} onClick={() => setTool("diamond")}>
            <LuDiamond size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">4</span>
          </a>
          <a className={toolClass("circle")} onClick={() => setTool("circle")}>
            <FaRegCircle size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">5</span>
          </a>


          <a className={toolClass("pencil")} onClick={() => setTool("pencil")}>
            <FaPencil size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">6</span>
          </a>
          <a className={toolClass("text")} onClick={() => setTool("text")}>
            <PiTextTBold size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">7</span>
          </a>
          <a className={toolClass("eraser")} onClick={() => setTool("eraser")}>
            <BiSolidEraser size={"1rem"} />
            <span className="text-slate-400 absolute ml-4 top-7 text-xxs">0</span>
          </a>
          <a href="download_link" onClick={saveImageToLocal} className="color: #f1f5f9;">
            <HiOutlineDownload size={"1rem"} /></a>
        </div>
        <button className="bg-teal-200 text-xs text-teal-800 shadow-sm rounded-md border px-2 " onClick={() => setTool("share")} >
          Share
        </button>
      </div>
      <div className="w-60 fixed left-0 top-10 my-6 mx-3 px-2 flex flex-col gap-2 rounded-lg border shadow-lg bg-white z-20">
      <div className="w-full relative  flex justify-between items-center bg-white py-3 px-3 w-fit mx-auto rounded-lg">
          <span className="text-md">Theme</span>
          <div className="flex justify-center items-center mt-2 bg-teal-200 text-teal-800  rounded-md border">
            <button className="bg-teal-200 px-1 py-1" onClick={() => handleSetBgCanvas(3)}><MdLightMode size={"1rem"}/></button>
            <button className="bg-teal-200 px-1 py-1 " onClick={() => handleSetBgCanvas(4)}><MdDarkMode size={"1rem"}/></button>
            <button className="bg-teal-200 px-1 py-1" onClick={() => handleSetBgCanvas(4)}><HiMiniComputerDesktop size={"1rem"}/></button>
          </div>
        </div>
        <hr className="w-56"/>

        <div className="w-full relative flex justify-center items-center bg-white py-3 px-3 mx-auto rounded-lg">
          <span className="absolute text-sm top-0 left-0">Canvas Background</span>
          <div className="gap-1 flex justify-center items-center content-between mt-4">
            <button className="bg-slate-100 border-slate-400 rounded-md" onClick={() => handleSetBgCanvas(0)}></button>
            <button className="bg-red-100 border-slate-400 rounded-md" onClick={() => handleSetBgCanvas(1)}></button>
            <button className="bg-orange-100  border-slate-400 rounded-md" onClick={() => handleSetBgCanvas(2)}></button>
            <button className="bg-fuchsia-100  border-slate-400 rounded-md" onClick={() => handleSetBgCanvas(3)}></button>
            <button className="bg-blue-100  border-slate-400 rounded-md" onClick={() => handleSetBgCanvas(4)}></button>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0  flex justify-center items-center gap-2 z-20 pb-2 pl-2">
        <div className="bg-teal-200 text-xs text-teal-800 shadow-sm rounded-md border">
          <button className="bg-teal-200  text-teal-800" onClick={() => onZoom(-0.1)}>-</button>
          <span onClick={() => setScale(1)}> {new Intl.NumberFormat("dn-GB", { style: "percent" }).format(scale)} </span>
          <button className="bg-teal-200  text-teal-800 rounded-md" onClick={() => onZoom(+0.1)}>+</button>
        </div>

        <div className="bg-teal-200 text-teal-800 shadow-sm rounded-md border">
          <button className="bg-teal-200 text-teal-800  rounded-md border" onClick={undo}>
            <IoIosUndo size={"1rem"} />
          </button>
          <button className="bg-teal-200 text-teal-800  rounded-md border" onClick={redo}>
            <IoIosRedo size={"1rem"} />
          </button>
        </div>
      </div>
      {action === "writing" ? (
        <textarea
          ref={textAreaRef}
          onBlur={handleBlur}
          style={{
            position: "fixed",
            left: selectedElement.x1 + panOffset.x,
            top: selectedElement.y1 - 2 + panOffset.y,
            font: "24px Courier New",
            margin: 0,
            padding: 0,
            outline: 0,
            resize: "auto",
            overflow: "hidden",
            whiteSpace: "pre",
            background: "transparent"

          }} />
      ) : null}
      <canvas
        id="canvas"
        ref={canvasRef}
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        style={{ position: "absolute", zIndex: 0, backgroundColor: color }}
      >
        Canvas
      </canvas>
    </div>
  );
};
export default App;
