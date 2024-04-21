import {
    type ObjectDetectionPipeline,
    pipeline,
    env,
} from "@xenova/transformers";
env.allowLocalModels = false;
env.useBrowserCache = false;

const task = "object-detection" as const;
const model = "Xenova/detr-resnet-50";
let instance: Promise<ObjectDetectionPipeline> | null = null;

async function getInstance() {
    if (instance === null) {
        instance = pipeline(task, model);
    }
    return instance;
}

self.addEventListener("message", async (event) => {
    const detector = await getInstance();
    self.postMessage({status: "initialized"});
    const output = await detector(event.data.input, {
        threshold: 0.5,
        percentage: true,
    });
    console.log(output);
    self.postMessage({ status: "complete", output });
});
