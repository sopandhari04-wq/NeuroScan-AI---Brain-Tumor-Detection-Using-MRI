import tensorflow as tf

model = tf.keras.models.load_model("models/new_model.keras")
model.save("models/new_model.h5", save_format="h5")
print("Done! new_model.h5 saved.")