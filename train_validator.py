import os
import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from PIL import Image
import urllib.request
import pickle
import shutil

print(f"TensorFlow version: {tf.__version__}")

# ── Create dataset folders ──
os.makedirs('dataset/mri', exist_ok=True)
os.makedirs('dataset/not_mri', exist_ok=True)

# ── Generate not_mri images ──
if len(os.listdir('dataset/not_mri')) < 100:
    print("Generating not_mri images...")
    import random
    count = 0
    
    # 1. CIFAR-10 images
    for batch_num in range(1, 4):
        with open(f'cifar-10-batches-py/data_batch_{batch_num}', 'rb') as f:
            batch = pickle.load(f, encoding='bytes')
        images = batch[b'data'].reshape(-1, 3, 32, 32).transpose(0, 2, 3, 1)
        for i, img_array in enumerate(images[:1000]):
            img = Image.fromarray(img_array).resize((128, 128))
            img.save(f'dataset/not_mri/cifar_{batch_num}_{i}.jpg')
            count += 1

    # 2. Solid color images
    for i in range(500):
        r, g, b = random.randint(200, 255), random.randint(200, 255), random.randint(200, 255)
        img = Image.new('RGB', (128, 128), color=(r, g, b))
        img.save(f'dataset/not_mri/solid_{i}.jpg')
        count += 1

    # 3. Gradient images (like documents/screenshots)
    for i in range(500):
        arr = np.ones((128, 128, 3), dtype=np.uint8) * random.randint(180, 255)
        # Add some noise
        noise = np.random.randint(0, 30, (128, 128, 3), dtype=np.uint8)
        arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr)
        img.save(f'dataset/not_mri/gradient_{i}.jpg')
        count += 1

    # 4. Dark random noise (not brain-like)
    for i in range(500):
        arr = np.random.randint(0, 255, (128, 128, 3), dtype=np.uint8)
        img = Image.fromarray(arr)
        img.save(f'dataset/not_mri/noise_{i}.jpg')
        count += 1

    # 5. Text-like white images with patterns
    for i in range(500):
        arr = np.ones((128, 128, 3), dtype=np.uint8) * 240
        # Add horizontal lines (like text)
        for line in range(0, 128, 10):
            arr[line:line+2, :] = [100, 100, 100]
        img = Image.fromarray(arr)
        img.save(f'dataset/not_mri/text_{i}.jpg')
        count += 1

    print(f"Not MRI images: {count}")

# ── Copy MRI images ──
MRI_SOURCE = r"C:\Users\Sopan\Downloads\Tumor dataset\Training"
if len(os.listdir('dataset/mri')) < 100:
    print("Copying MRI images...")
    count = 0
    for root, dirs, files in os.walk(MRI_SOURCE):
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                shutil.copy(os.path.join(root, f), f'dataset/mri/{count}_{f}')
                count += 1
    print(f"MRI images copied: {count}")

print(f"MRI: {len(os.listdir('dataset/mri'))}")
print(f"Not MRI: {len(os.listdir('dataset/not_mri'))}")

# ── Train ──
datagen = ImageDataGenerator(rescale=1./255, validation_split=0.2)

train_gen = datagen.flow_from_directory(
    'dataset', target_size=(128, 128),
    batch_size=32, class_mode='binary', subset='training'
)
val_gen = datagen.flow_from_directory(
    'dataset', target_size=(128, 128),
    batch_size=32, class_mode='binary', subset='validation'
)

print("Classes:", train_gen.class_indices)

base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=(128, 128, 3))
base_model.trainable = False

model = models.Sequential([
    base_model,
    layers.GlobalAveragePooling2D(),
    layers.Dense(128, activation='relu'),
    layers.Dropout(0.3),
    layers.Dense(1, activation='sigmoid')
])

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

print("Training...")
model.fit(
    train_gen,
    validation_data=val_gen,
    epochs=10,
    callbacks=[tf.keras.callbacks.EarlyStopping(patience=3, restore_best_weights=True)]
)

# ── Export TFLite ──
print("Converting to TFLite...")
converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
tflite_model = converter.convert()

with open('mri_validator.tflite', 'wb') as f:
    f.write(tflite_model)

print(f"✅ Done! TF version: {tf.__version__}")
print(f"✅ Model saved: mri_validator.tflite ({len(tflite_model)/1024:.1f} KB)")