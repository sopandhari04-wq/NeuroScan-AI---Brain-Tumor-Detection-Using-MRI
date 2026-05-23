import tensorflow as tf

# Load your model
model = tf.keras.models.load_model("models/brain_tumor_model.h5", compile=False)

# Convert to TFLite
converter = tf.lite.TFLiteConverter.from_keras_model(model)
tflite_model = converter.convert()

# Save
with open("models/model.tflite", "wb") as f:
    f.write(tflite_model)

print("Done! model.tflite saved.")