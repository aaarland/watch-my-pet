import { For, Show, onCleanup, onMount } from "solid-js";
import "./App.css";
import { createCameras } from "@solid-primitives/devices";
import { createPermission } from "@solid-primitives/permission";
import {
    ObjectDetectionPipelineSingle,
    type ObjectDetectionPipelineOutput,
} from "@xenova/transformers";

export type ObjectDetectionMessage =
    | {
          status: "complete";
          output:
              | ObjectDetectionPipelineOutput
              | ObjectDetectionPipelineOutput[];
      }
    | { status: "initialized" };

function Camera() {
    const cameras = createCameras();
    let videoRef!: HTMLVideoElement;
    let imageRef!: HTMLImageElement;
    let canvasRef!: HTMLCanvasElement;
    let imageContainerRef!: HTMLDivElement;
    let timer: ReturnType<typeof setInterval> | undefined;
    let worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
    });

    function onMessageRecieved(e: MessageEvent<ObjectDetectionMessage>) {
        switch (e.data.status) {
            case "complete": {
                const output = e.data.output;
                output.flat().forEach(renderBox);
            }
        }
    }

    onMount(() => {
        worker.addEventListener("message", onMessageRecieved);
    });

    onCleanup(() => {
        worker.removeEventListener("message", onMessageRecieved);
    });

    function clearphoto() {
        const context = canvasRef.getContext("2d");
        if (context === null) return;
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, canvasRef.width, canvasRef.height);

        const data = canvasRef.toDataURL("image/png");
        imageRef.setAttribute("src", data);
    }
    function updateImage() {
        const context = canvasRef.getContext("2d");
        if (context === null) return;
        context.drawImage(videoRef, 0, 0, canvasRef.width, canvasRef.height);

        const data = canvasRef.toDataURL("image/png");
        worker.postMessage({ input: data });
        imageRef.setAttribute("src", data);
    }

    function renderBox({ box, label }: ObjectDetectionPipelineSingle) {
        const { xmax, xmin, ymax, ymin } = box;

        // Generate a random color for the box
        const color =
            "#" +
            Math.floor(Math.random() * 0xffffff)
                .toString(16)
                .padStart(6, "0");

        // Draw the box
        const boxElement = document.createElement("div");
        boxElement.className = "bounding-box";
        Object.assign(boxElement.style, {
            borderColor: color,
            left: 100 * xmin + "%",
            top: 100 * ymin + "%",
            width: 100 * (xmax - xmin) + "%",
            height: 100 * (ymax - ymin) + "%",
        });

        // Draw label
        const labelElement = document.createElement("span");
        labelElement.textContent = label;
        labelElement.className = "bounding-box-label";
        labelElement.style.backgroundColor = color;

        boxElement.appendChild(labelElement);
        imageContainerRef.appendChild(boxElement);
    }

    async function setVideo(deviceId: string) {
        const selectedCamera = cameras().find(
            (camera) => camera.deviceId === deviceId,
        );

        const videoSource =
            selectedCamera === undefined
                ? false
                : { deviceId: selectedCamera.deviceId };
        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoSource,
        });
        videoRef.srcObject = stream;
        await videoRef.play();
        console.log(videoRef.videoWidth, videoRef.videoHeight);
        canvasRef.width = videoRef.videoWidth;
        canvasRef.height = videoRef.videoHeight;
        clearphoto();
        if (timer !== undefined) {
            clearInterval(timer);
        }
        updateImage();
        // timer = setInterval(() => updateImage(), 5000);
    }

    return (
        <>
            <div>
                <video ref={videoRef} />
                <div ref={imageContainerRef} id="image-container">
                    <img ref={imageRef} />
                </div>
                <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            <Show when={cameras().length > 0}>
                <select onChange={(e) => setVideo(e.target.value)}>
                    <option>Select Camera</option>
                    <For each={cameras()} fallback={<p>No cameras found</p>}>
                        {(item) => <option>{item.deviceId}</option>}
                    </For>
                </select>
            </Show>
        </>
    );
}

function App() {
    const cameraPermission = createPermission("camera");
    onMount(async () => {
        navigator.mediaDevices
            .getUserMedia({ video: true })
            .then((stream) =>
                stream.getTracks().forEach((track) => track.stop()),
            )
            .catch(console.warn);
    });
    return (
        <>
            <h1>Watch My Pet</h1>
            <Show
                when={
                    cameraPermission() === "granted" ||
                    cameraPermission() === "prompt"
                }
                fallback={<p>Permissions not granted</p>}
            >
                <Camera />
            </Show>
            <p class="read-the-docs">
                Click on the Vite and Solid logos to learn more
            </p>
        </>
    );
}

export default App;
