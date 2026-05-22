import tensorflow as tf

# Load old model
model = tf.keras.models.load_model(
    "models/brain_tumor_model.h5",
    compile=False
)

# Save in newer compatible format
model.save("models/new_model.keras")

print("Model converted successfully!")