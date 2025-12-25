import requests,os

def save_thumbnail(url, task_id,resolution=144):
    path = os.path.abspath("thumbnails")
    if not os.path.exists(path):
        os.makedirs(path)

    file_path = os.path.join(path, f"{task_id}_{resolution}.jpg")
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()  # Check if the request was successful

        with open(file_path, 'wb') as file:
            for chunk in response.iter_content(1024):
                file.write(chunk)
        print(f"Thumbnail saved to {file_path}")
        return file_path
    except requests.exceptions.RequestException as e:
        print(f"Error downloading thumbnail: {e}")
        return None
    
if __name__ == "__main__":
    # Example usage
    print(save_thumbnail("https://i.ytimg.com/vi/j4aqZcQpHCU/hq720.jpg", "j4aqZcQpHCU_144.jpg"))

