# Libraries
import tkinter as tk
import customtkinter
from PIL import ImageTk, Image

# Ui Settings
customtkinter.set_appearance_mode("dark")
customtkinter.set_default_color_theme("dark-blue")
# Main Window settings
app = customtkinter.CTk()
app.geometry("400x500")
app.title("Login Page")
# Load and set background image
bg_image = ImageTk.PhotoImage(Image.open("background.jpg").resize((400, 500))

#button_image = ImageTk.PhotoImage(Image.open("login_icon.png").resize((100, 100)))
app.mainloop()