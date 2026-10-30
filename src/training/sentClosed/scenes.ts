import type { ImageSourcePropType } from "react-native";

/**
 * 문장인지 Closed 연습 — 장면 9개.
 * 음원은 임시 TTS(Windows Heami). 사람 녹음으로 교체할 자리.
 */

export const SUBJECTS = ["father", "mother", "postman"] as const;
export const ACTIONS = ["phone", "medicine", "umbrella"] as const;

export type SubjectId = (typeof SUBJECTS)[number];
export type ActionId = (typeof ACTIONS)[number];
export type SceneId = `${SubjectId}_${ActionId}`;

export type Scene = {
  id: SceneId;
  subject: SubjectId;
  action: ActionId;
  /** 들려줄 문장. 보기 칸에 글자로 올리지 않음. */
  sentence: string;
  image: ImageSourcePropType;
  /** Metro 에셋 id. 임시 TTS wav. */
  audio: number;
};

export const SCENES: readonly Scene[] = [
  {
    id: "father_phone",
    subject: "father",
    action: "phone",
    sentence: "아버지가 전화 받아요",
    image: require("@/assets/9_img/man-phone.webp"),
    audio: require("@/assets/9_sent/man-phone.wav"),
  },
  {
    id: "father_medicine",
    subject: "father",
    action: "medicine",
    sentence: "아버지가 약 먹어요",
    image: require("@/assets/9_img/man-medicine.webp"),
    audio: require("@/assets/9_sent/man-medicine.wav"),
  },
  {
    id: "father_umbrella",
    subject: "father",
    action: "umbrella",
    sentence: "아버지가 우산 써요",
    image: require("@/assets/9_img/man-umb.webp"),
    audio: require("@/assets/9_sent/man-umb.wav"),
  },
  {
    id: "mother_phone",
    subject: "mother",
    action: "phone",
    sentence: "어머니가 전화 받아요",
    image: require("@/assets/9_img/woman-phone.webp"),
    audio: require("@/assets/9_sent/woman-phone.wav"),
  },
  {
    id: "mother_medicine",
    subject: "mother",
    action: "medicine",
    sentence: "어머니가 약 먹어요",
    image: require("@/assets/9_img/woman-medicine.webp"),
    audio: require("@/assets/9_sent/woman-medicine.wav"),
  },
  {
    id: "mother_umbrella",
    subject: "mother",
    action: "umbrella",
    sentence: "어머니가 우산 써요",
    image: require("@/assets/9_img/woman-umb.webp"),
    audio: require("@/assets/9_sent/woman-umb.wav"),
  },
  {
    id: "postman_phone",
    subject: "postman",
    action: "phone",
    sentence: "집배원이 전화 받아요",
    image: require("@/assets/9_img/post-phone.webp"),
    audio: require("@/assets/9_sent/post-phone.wav"),
  },
  {
    id: "postman_medicine",
    subject: "postman",
    action: "medicine",
    sentence: "집배원이 약 먹어요",
    image: require("@/assets/9_img/post-medicine.webp"),
    audio: require("@/assets/9_sent/post-medicine.wav"),
  },
  {
    id: "postman_umbrella",
    subject: "postman",
    action: "umbrella",
    sentence: "집배원이 우산 써요",
    image: require("@/assets/9_img/post-umb_1.png"),
    audio: require("@/assets/9_sent/post-umb.wav"),
  },
];

const SCENE_MAP: ReadonlyMap<SceneId, Scene> = new Map(
  SCENES.map((scene) => [scene.id, scene]),
);

export function sceneIdOf(subject: SubjectId, action: ActionId): SceneId {
  return `${subject}_${action}`;
}

export function sceneOf(id: SceneId): Scene {
  const scene = SCENE_MAP.get(id);
  if (!scene) {
    throw new Error(`unknown scene: ${id}`);
  }
  return scene;
}
