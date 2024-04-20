import { For, Show, createSignal, onMount } from "solid-js";
import "./App.css";
import { createCameras } from "@solid-primitives/devices";
import { createPermission } from "@solid-primitives/permission";

function Camera() {
    const cameras = createCameras();
    let videoRef!: HTMLVideoElement;
    let imageRef!: HTMLImageElement;
    let canvasRef!: HTMLCanvasElement;
    let timer: number | undefined;

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
        imageRef.setAttribute("src", data);
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
        timer = setInterval(() => updateImage(), 5000);
    }

    return (
        <>
            <div>
                <video ref={videoRef} />
                <img ref={imageRef} />
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
    const [count, setCount] = createSignal(0);
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
