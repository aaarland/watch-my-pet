import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
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

function RenderBox({ box, label }: ObjectDetectionPipelineSingle) {
    const { xmax, xmin, ymax, ymin } = box;
    const color =
        "#" +
        Math.floor(Math.random() * 0xffffff)
            .toString(16)
            .padStart(6, "0");

    return (
        <div
            class="bounding-box"
            style={{
                "border-color": color,
                left: 100 * xmin + "%",
                top: 100 * ymin + "%",
                width: 100 * (xmax - xmin) + "%",
                height: 100 * (ymax - ymin) + "%",
            }}
        >
            <div
                class="bounding-box-label"
                style={{ "background-color": color }}
            >
                {label}
            </div>
        </div>
    );
}

function Camera() {
    const cameras = createCameras();
    let videoRef!: HTMLVideoElement;
    let [boxes, setBoxes] = createSignal<ObjectDetectionPipelineSingle[]>([]);
    let [image, setImage] = createSignal<string | null>(null);
    let worker = new Worker(new URL("./worker.ts", import.meta.url), {
        type: "module",
    });

    function onMessageRecieved(e: MessageEvent<ObjectDetectionMessage>) {
        switch (e.data.status) {
            case "complete": {
                const output = e.data.output;
                setBoxes(output.flat());
            }
        }
    }

    onMount(() => {
        worker.addEventListener("message", onMessageRecieved);
    });

    onCleanup(() => {
        worker.removeEventListener("message", onMessageRecieved);
    });

    function clearphoto(canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d");
        if (context === null) return;
        context.fillStyle = "#AAA";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/png");
        setImage(data);
        // imageRef.setAttribute("src", data);
    }
    function updateImage(canvas: HTMLCanvasElement) {
        const context = canvas.getContext("2d");
        if (context === null) return;
        context.drawImage(videoRef, 0, 0, canvas.width, canvas.height);

        const data = canvas.toDataURL("image/png");
        worker.postMessage({ input: data });
        setImage(data);
        // imageRef.setAttribute("src", data);
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
    }

    function makeCanvas() {
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.videoWidth;
        canvas.height = videoRef.videoHeight;
        return canvas;
    }

    return (
        <>
            <div class="col">
                <video ref={videoRef} />
                <button onClick={() => updateImage(makeCanvas())}>Take New Photo</button>
                <div id="image-container">
                    <For each={boxes()}>{(box) => <RenderBox {...box} />}</For>
                    <Show when={image() !== null}><img src={image() ?? undefined}/></Show>
                </div>
            </div>
            <Show when={cameras().length > 0}>
                <select onChange={(e) => setVideo(e.target.value)}>
                    <option>Select Camera</option>
                    <For each={cameras()} fallback={<p>No cameras found</p>}>
                        {(item) => (
                            <option value={item.deviceId}>{item.label}</option>
                        )}
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
        </>
    );
}

export default App;
