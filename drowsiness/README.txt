pip3 install -r requirements.txt
python3 manage.py makemigrations accounts
python3 manage.py migrate
python3 manage.py runserver
Open http://127.0.0.1:8000/
